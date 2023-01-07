FROM eyereasoner/eye:latest
LABEL maintainer="https://github.com/eyereasoner/"

RUN apt-get update && apt-get install -y \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN npm -g install eyeserver

EXPOSE 8000
CMD ["8000"]
ENTRYPOINT ["eyeserver"]