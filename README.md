# alpr-gate-opener

This is a work in progress of a ALPR gate opener which uses (for now) a simple interface to upload a photo with the front of a car with visible license plate and recognize it.

This work is inspired from https://github.com/ahasera/alpr-rtsp/

The project is split into 4 parts:

## 1. Frontend
python3.10 based script using OpenCV, paddleOCR and UltraLytics YOLO library to do license plate recognition. There are also 2 models configured which are not present here due to Github's LFS limitation. I will provide additional links to download those: best.pt and yolov8x.pt . First is a custom trained model for license plate recognition, the other is a model for car recognition

How it works in a nutshell: You provide a photo on a simple web interface, the system detects cars in the photo, and after the cars are detected it will detect their license plate. 
To customize the sensitivity of the detection, check main.py line 66 for "conf=0.5". This is the confidence of the model detection. To further eliminate false positives, raise the number. 0.5 means 50% confidence, 0.6 is 60%, etc.

After the plate is recognized , the Frontend will send the information to the Backend via /check_plate URI to see if the plate number is existent in a database which is backed by MongoDB 4.4 (Note that from MongoDB 5.x, you need to have a computer or server
that has AVX extensions, that is why I opted for an older version of MongoDB so this software works on any hardware)

If the plate is recognized, a custom command will be ran (open a garage door, remote barrier, whatever)


## 2. Backend 
NodeJS 20 - this is a simple program that listens on 3002 on localhost by default and it has .env file for configuration for MongoDB URI. If used with docker, you can add there the service name from docker compose , for example if service name is "mongo" then you will add as URI: `mongodb://mongo:27017/gate` . "gate" here being the collection. Can be any name.
This is work in progress, it has a number of endpoints:

```/check_plate - verifies in mongo if the plate number is existent, and enabled: true. (can be existent or disabled)
/log - custom endpoint to log attemtps for plate recognition.
/admin/add_plate - add a license plate to DB 
/admin/remove_plate - remove a license plate from DB
/admin/toggle_plate - set a license plate to enabled/disabled
/admin/logs - see all logs
/admin/delete_logs - delete all logs
/admin/create_token - create a token for accessing the backend API
/admin/delete_token - delete a token
```

## 3. Admin 
NodeJS 20  - this is aimed to transfer the /admin endpoints from backend and move them to this module which in the future will have a simple web interface for all these /admin endpoints. Right now, here the /admin/create_token works by authenticated first with a predefined password configured in .env file, and it will use JWT to create a 1 hour valid token , added to the database, and more work to do is to actually add the token verification to all /admin endpoints.

## 4. MongoDB 4.4
This is a normal installation of MongoDB 4.4, if you want to test locally your microservices, just comment out in `docker-compose.yaml` all the services except mongodb and connect to `localhost:27017` 

# Getting started

Download the models from here: https://mega.nz/#fm/MygG0TZA and add them to frontend/ folder.

Modify `.env` file on `admin/` and `backend/` for MongoDB connectivity

Modify `docker-compose.yaml` with your test domain, you will have a Traefik load balancer in front which will get Lets Encrypt SSL certificates for your microservices.

Access URL to frontend IP port 3001 like so https://domain.configured.in.docker-compose/upload or locally without Traefik: `http://ip_of_docker_host:3001/upload`.

In order for this to work, all services must be up.

After you configure everything (docker-compose.yaml, download models to frontend, modify .env variables) run `docker-compose build` or `docker compose build` depending on your docker version. Wait for build, then run `docker compose up -d`

# Contributing

This is heavily work in progress, feel free to open PRs if you want to contribute.


## LICENSE
MIT License

## TO DO

- [ ]  Authenticate all endpoints with generated token, including the frontend microservice needs to get a token first and then authenticate its /check_plate call with the token.
- [ ]  Add endpoints which can delete/get a certain ID for a a single plate number or log entry.
- [ ]  Create a simple admin interface where you can see a table of all allowed plates, all logs and have actions available as calls to endpoints: add/remove/modify number plates, add/remove/modify log entries add/remove tokens, etc.
- [ ]  Add logic to switch the Frontend to continously monitor a webcam / monitoring camera web stream via USB or RTSP and detect cars with license plates that are approaching to check if they are allowed to have the door opened.

