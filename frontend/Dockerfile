# Use an official Python runtime as a parent image
FROM python:3.10.14-slim-bookworm as BUILD

# Set the working directory in the container
WORKDIR /app

# Install the necessary packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Python dependencies
FROM python:3.10.14-slim-bookworm

WORKDIR /app

COPY --from=build /usr/local/lib/python3.10 /usr/local/lib/python3.10
COPY --from=build /usr/local/bin /usr/local/bin
COPY --from=build /app /app
COPY . .
# Expose port 5000 for Flask service
EXPOSE 3001

# Define environment variable
ENV FLASK_APP=main.py

# Run the application
CMD ["flask", "run", "--host=0.0.0.0"]
