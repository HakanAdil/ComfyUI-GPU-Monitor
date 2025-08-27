# ComfyUI-GPU-Monitor — web eklentisini ve /gpu endpointini yükler
WEB_DIRECTORY = "./web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Route kaydı import edildiğinde yapılır:
from . import gpu_monitor  # noqa: F401
