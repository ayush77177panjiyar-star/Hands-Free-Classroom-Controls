import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from backend.app.schemas.tracking import (
    FrameProcessRequest,
    FrameProcessResponse,
    TrackingStatus,
)
from backend.app.services.frame_processor import frame_processor
from backend.app.services.mediapipe_service import mediapipe_service

router = APIRouter()


@router.post(
    "/process-frame",
    response_model=FrameProcessResponse,
    summary="Process Single Webcam Video Frame",
    description="Accepts base64 encoded image frame, runs MediaPipe Hand Landmarker, and returns 21 landmarks and gesture.",
)
async def process_frame_endpoint(request: FrameProcessRequest):
    try:
        response = frame_processor.process_frame(request)
        return response
    except Exception as e:
        return FrameProcessResponse(
            success=False,
            error=f"Frame processing error: {str(e)}",
            processing_time_ms=0.0,
        )


@router.get(
    "/status",
    response_model=TrackingStatus,
    summary="Get Computer Vision & Model Status",
)
async def get_tracking_status():
    avg_latency = 0.0
    if frame_processor.total_frames_processed > 0:
        avg_latency = round(
            frame_processor.total_latency_ms / frame_processor.total_frames_processed, 2
        )

    is_loaded = mediapipe_service.is_ready()
    return TrackingStatus(
        status="ready" if is_loaded else "standby",
        model_loaded=is_loaded,
        model_name="MediaPipe Hand Landmarker Tasks API",
        max_hands=2,
        total_frames_processed=frame_processor.total_frames_processed,
        average_latency_ms=avg_latency,
    )


@router.websocket("/ws")
async def tracking_websocket(websocket: WebSocket):
    """
    Streaming WebSocket endpoint for ultra-low latency real-time frame processing.
    """
    await websocket.accept()
    print("[WS] WebSocket client connected to tracking stream")
    try:
        while True:
            text_data = await websocket.receive_text()
            data = json.loads(text_data)

            # Heartbeat ping handling
            if data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            req = FrameProcessRequest(
                image=data.get("image", ""),
                session_id=data.get("session_id", "ws_session"),
                client_timestamp_ms=data.get("client_timestamp_ms"),
                preferred_hand=data.get("preferred_hand", "right"),
                smoothing_factor=data.get("smoothing_factor", 0.65),
            )

            res = frame_processor.process_frame(req)
            await websocket.send_text(res.model_dump_json())

    except WebSocketDisconnect:
        print("[WS] WebSocket client disconnected cleanly")
    except Exception as e:
        print(f"[WS ERROR] WebSocket error: {e}")

        try:
            await websocket.close()
        except Exception:
            pass
