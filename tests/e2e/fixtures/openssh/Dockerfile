FROM alpine:3.20

RUN apk add --no-cache openssh-server \
  && adduser -D -h /home/e2e -s /bin/sh e2e \
  && mkdir -p /home/e2e/.ssh /srv/terminallyskill-e2e /run/sshd \
  && chown -R e2e:e2e /home/e2e /srv/terminallyskill-e2e

COPY start-sshd.sh /usr/local/bin/start-sshd
RUN chmod +x /usr/local/bin/start-sshd

EXPOSE 2222

ENTRYPOINT ["/usr/local/bin/start-sshd"]
CMD ["/usr/sbin/sshd", "-D", "-e", "-p", "2222", "-o", "PasswordAuthentication=no", "-o", "PermitRootLogin=no", "-o", "PubkeyAuthentication=yes", "-o", "StrictModes=no"]
