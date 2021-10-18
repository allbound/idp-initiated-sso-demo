#!/bin/bash
$(aws ecr get-login --region us-west-2 --no-include-email)
docker build . --no-cache -t 707112942371.dkr.ecr.us-west-2.amazonaws.com/demo-apps:latest
docker push 707112942371.dkr.ecr.us-west-2.amazonaws.com/demo-apps:latest
