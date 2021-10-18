FROM node:8
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN mv file.txt node_modules/passport-saml/lib/passport-saml/saml.js
RUN touch /app/idp_cert.pem && chmod  600 /app/idp_cert.pem
CMD node app.js
EXPOSE 9090