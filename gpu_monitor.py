import os, sys, json, psutil
from aiohttp import web
from server import PromptServer

# NVML (pynvml) — paket adı nvidia-ml-py3, import adı pynvml
def _init_nvml():
    import pynvml as n
    try:
        n.nvmlInit()
        return n
    except Exception:
        # Windows için olası dll konumlarını dene
        if sys.platform.startswith("win"):
            candidates = [
                r"C:\Windows\System32\nvml.dll",
                r"C:\Program Files\NVIDIA Corporation\NVSMI\nvml.dll",
            ]
            for p in candidates:
                if os.path.exists(p):
                    os.environ["NVML_DLL"] = p
                    n.nvmlInit()
                    return n
        raise

def _gpu_snapshot(n):
    count = n.nvmlDeviceGetCount()
    out = []
    for i in range(count):
        h = n.nvmlDeviceGetHandleByIndex(i)
        name = n.nvmlDeviceGetName(h).decode() if isinstance(n.nvmlDeviceGetName(h), bytes) else n.nvmlDeviceGetName(h)
        mem = n.nvmlDeviceGetMemoryInfo(h)
        util = n.nvmlDeviceGetUtilizationRates(h).gpu
        temp = n.nvmlDeviceGetTemperature(h, n.NVML_TEMPERATURE_GPU)
        power = None
        try:
            power = n.nvmlDeviceGetPowerUsage(h) / 1000.0  # W
        except Exception:
            power = None

        # process list (bazıları permission sebebiyle 0 dönebilir)
        procs = []
        try:
            for p in n.nvmlDeviceGetComputeRunningProcesses_v3(h):
                mem_mb = int(getattr(p, "usedGpuMemory", 0) / (1024 * 1024))
                procs.append({"pid": int(p.pid), "mem_mb": max(mem_mb, 0)})
        except Exception:
            pass

        out.append({
            "index": i,
            "name": name,
            "util": int(util),
            "mem_used_mb": int(mem.used / (1024 * 1024)),
            "mem_total_mb": int(mem.total / (1024 * 1024)),
            "temp_c": int(temp),
            "power_w": float(power) if power is not None else None,
            "procs": procs,
        })
    return out

def _torch_info():
    try:
        import torch
        devs, alloc, reserv = [], [], []
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                devs.append(torch.cuda.get_device_name(i))
                a = torch.cuda.memory_allocated(i) // (1024 * 1024)
                r = torch.cuda.memory_reserved(i) // (1024 * 1024)
                alloc.append(int(a)); reserv.append(int(r))
        return {"devices": devs, "allocated_mb": alloc, "reserved_mb": reserv}
    except Exception:
        return {"devices": [], "allocated_mb": [], "reserved_mb": []}

@PromptServer.instance.routes.get("/gpu")
async def gpu(request: web.Request):
    try:
        n = _init_nvml()
        gpus = _gpu_snapshot(n)
        data = {
            "ok": True,
            "gpus": gpus,
            "torch": _torch_info(),
            "pid": os.getpid(),
        }
        return web.json_response(data)
    except Exception as e:
        return web.json_response({"ok": False, "error": f"/gpu exception: {e}"}, status=200)
