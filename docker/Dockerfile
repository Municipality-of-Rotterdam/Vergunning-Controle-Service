# This dockerfile is used to create an image for the Rotterdam VCS project for the Gitlab CI
# To generate a new image please cd into this directory `cd ./docker` and run: `docker build -t vcs-rotterdam-image:latest .` (Make sure you have a docker instance running)
# After generating the image you can test it locally with `docker run -it vcs-rotterdam-image:latest /bin/bash` and exit the environment with `exit`

# Use an official Ubuntu as a parent image
FROM ubuntu:24.04

# Set the environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Update the package repository and install dependencies
RUN apt-get update && apt-get install -y \
    software-properties-common \
    curl \
    gnupg \
    build-essential \
    wget \
    libssl-dev \
    zlib1g-dev \
    libncurses5-dev \
    libgdbm-dev \
    libnss3-dev \
    libsqlite3-dev \
    libreadline-dev \
    libffi-dev \
    libbz2-dev

# Install Python
RUN apt-get install -y python3

# Verify Python installation
RUN python3 --version

# Install Java (OpenJDK 17)
RUN apt-get install -y openjdk-17-jdk

# Verify Java installation
RUN java --version

# Install Node.js (LTS version)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs

# Verify Node installation
RUN node --version

RUN apt-get install -y unzip git

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the default command to run when starting the container
CMD ["bash"]
