FROM openjdk:17-jdk-slim

# Install Android SDK
ENV ANDROID_SDK_ROOT /opt/android-sdk
ENV PATH ${PATH}:${ANDROID_SDK_ROOT}/tools:${ANDROID_SDK_ROOT}/platform-tools

RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and install Android SDK
RUN mkdir -p ${ANDROID_SDK_ROOT} && \
    cd ${ANDROID_SDK_ROOT} && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip commandlinetools-linux-9477386_latest.zip && \
    rm commandlinetools-linux-9477386_latest.zip

ENV PATH ${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/bin

# Accept licenses and install required packages
RUN yes | sdkmanager --sdk_root=${ANDROID_SDK_ROOT} --licenses
RUN sdkmanager --sdk_root=${ANDROID_SDK_ROOT} \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0"

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Make gradlew executable
RUN chmod +x ./gradlew

# Build arguments for signing
ARG KEYSTORE_FILE
ARG KEYSTORE_PASSWORD
ARG KEY_ALIAS
ARG KEY_PASSWORD
ARG BUILD_TYPE=release

# Set environment variables for signing
ENV KEYSTORE_FILE=${KEYSTORE_FILE}
ENV KEYSTORE_PASSWORD=${KEYSTORE_PASSWORD}
ENV KEY_ALIAS=${KEY_ALIAS}
ENV KEY_PASSWORD=${KEY_PASSWORD}

# Build the APK
RUN ./gradlew clean assemble${BUILD_TYPE} --no-daemon

# Create output directory
RUN mkdir -p /output

# Copy built APKs to output directory
RUN find app/build/outputs/apk -name "*.apk" -exec cp {} /output/ \;

# List output files
RUN ls -la /output/

CMD ["echo", "Build complete. APK files are in /output/"]