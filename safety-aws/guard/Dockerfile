# clothsy-guard: all safety observations for one image in one Lambda call.
# Build context is safety-aws/ (it reuses age/ for MiVOLO): ./build_and_push.sh
#
# Stage 1 exports MiVOLO v2 to ONNX and verifies it against PyTorch and MiVOLO's
# own preprocessing (identical to the clothsy-age build, so Docker reuses the
# layer). Stage 2 is the Lambda image: onnxruntime, numpy and OpenCV only; boto3
# comes with the Lambda base image. MiVOLO is installed without its dependency
# list, which includes ultralytics (AGPL-3.0) that the model never imports.

FROM python:3.12-slim AS export
RUN pip install --no-cache-dir torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir timm==0.8.13.dev0 transformers==4.51.0 accelerate==1.8.1 huggingface_hub==0.30.2 safetensors==0.5.3 \
      onnx==1.17.0 onnxruntime==1.20.1 opencv-python-headless==4.10.0.84 scipy==1.14.1 numpy==2.1.3 \
 && pip install --no-cache-dir "setuptools<70" wheel \
 && pip install --no-cache-dir --no-deps --no-build-isolation \
      https://github.com/WildChlamydia/MiVOLO/archive/37475e3f8818b5f22448003feec3e64b01bfb188.tar.gz
WORKDIR /build
COPY age/preprocess.py age/export_onnx.py ./
RUN mkdir -p /out && python export_onnx.py /out/mivolo_v2.onnx

FROM public.ecr.aws/lambda/python:3.12
RUN pip install --no-cache-dir onnxruntime==1.20.1 opencv-python-headless==4.10.0.84 numpy==2.1.3
COPY --from=export /out/mivolo_v2.onnx ${LAMBDA_TASK_ROOT}/
COPY age/preprocess.py guard/age.py guard/auth.py guard/fetch.py guard/observe.py guard/handler.py ${LAMBDA_TASK_ROOT}/
CMD ["handler.handler"]
