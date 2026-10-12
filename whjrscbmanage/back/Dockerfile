FROM 103.160.122.246/operator/openjdk:17-alpine
ENV DIST_NAME=whjrscbmanage \
	APP_VERSION=0.0.1-SNAPSHOT\
	SEVER_PORT=9057
COPY ./target/"$DIST_NAME-$APP_VERSION.jar" /home/gaps/"$DIST_NAME.jar"
EXPOSE $SEVER_PORT
RUN chown -R gaps:gaps /home/gaps/"$DIST_NAME.jar"
USER gaps
ENTRYPOINT java \
	-XX:+PrintFlagsFinal -XX:+UnlockExperimentalVMOptions $JAVA_OPTS \
	-Deureka.client.serviceUrl.defaultZone=$EUREKA_URL -Dapp.id=$APOLLO_APP_ID -jar /home/gaps/"$DIST_NAME.jar"
