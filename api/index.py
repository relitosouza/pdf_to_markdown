import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from markitdown import MarkItDown, StreamInfo

app = FastAPI()

# Enable CORS for frontend development/requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MarkItDown. Disable plugins by default to avoid startup/dependency issues.
markitdown_converter = MarkItDown(enable_plugins=False)

@app.post("/api/convert")
async def convert_file(file: UploadFile = File(...)):
    """
    Accepts any file upload and uses markitdown to convert it into Markdown.
    """
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="Sem nome de arquivo fornecido.")

    # Extract extension
    _, ext = os.path.splitext(filename)
    ext = ext.lower()

    try:
        # Read the file content into memory
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="O arquivo enviado está vazio.")

        # Wrap in BytesIO (which is seekable)
        file_stream = io.BytesIO(file_bytes)

        # Create StreamInfo to assist MarkItDown in identifying the file type
        stream_info = StreamInfo(
            filename=filename,
            extension=ext
        )

        # Execute conversion
        result = markitdown_converter.convert(file_stream, stream_info=stream_info)

        return {
            "success": True,
            "filename": filename,
            "extension": ext,
            "content": result.text_content
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Erro na conversão",
                "detail": str(e)
            }
        )

# For direct execution testing if needed
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
