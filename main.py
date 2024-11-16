from fastapi import FastAPI,Request
from uvicorn import run
import multiprocessing
from fastapi.middleware.cors import CORSMiddleware
from pygrabber.dshow_graph import FilterGraph

import os
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
from PIL import Image
import numpy as np
import datetime


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





@app.get("/devices")
async def get_body():
    print("Available video capture device names:")
    
    return "devices"



@app.post("/speech-to-text")
async def get_body(request: Request):
    data = await request.json()
    
    



    return data



if __name__ == '__main__':
    multiprocessing.freeze_support()  # For Windows support
    run(app, host="127.0.0.1", port=5000, reload=False, workers=1)
