import os
import io
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from markitdown import MarkItDown, StreamInfo, UnsupportedFormatException, FileConversionException

app = FastAPI(title="MarkItDown Web", description="Interface web para converter arquivos em Markdown")

# Initialize MarkItDown. Disable plugins by default to avoid issues with OpenAI client.
markitdown_converter = MarkItDown(enable_plugins=False)

# Directory paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(CURRENT_DIR, "static")

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

    except UnsupportedFormatException as e:
        return JSONResponse(
            status_code=415,
            content={
                "success": False,
                "error": "Formato não suportado",
                "detail": f"O formato de arquivo '{ext}' não é suportado pelo MarkItDown."
            }
        )
    except FileConversionException as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Falha na conversão",
                "detail": "Erro interno ao tentar converter o arquivo. Certifique-se de que o arquivo não está corrompido.",
                "trace": str(e)
            }
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Erro desconhecido",
                "detail": str(e)
            }
        )

# Serve static files. Make sure static directory exists before mounting.
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

# Mount the static directory for index.html, style.css, app.js
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
