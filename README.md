# Adonis API application

This is the boilerplate for creating an API server in AdonisJs, it comes pre-configured with.

1. Bodyparser
2. Authentication
3. CORS
4. Lucid ORM
5. Migrations and seeds

## Setup

Use the adonis command to install the blueprint

```bash
adonis new yardstick --api-only
```

or manually clone the repo and then run `npm install`.


### Migrations

Run the following command to run startup migrations.

```js
adonis migration:run
```
# abpac-api


# Instalar Redis
http://formvalidate.com/how-to-install-and-configure-redis-into-centos-8


# configurações apache
https://www.it-swarm.dev/pt/node.js/websockets-e-proxy-do-apache-como-configurar-o-mod-proxy-wstunnel/1050133925/



Kue
arquivo pm2.json
{
  "apps" : [{
    "name"        : "server",
    "script"      : "./server.js",
  },{
    "name"       : "kue",
    "script"     : "adonis kue:listen",
  }]
}

comando: pm2 startOrRestart pm2.json

log: pm2 logs




/// TESTES

…or create a new repository on the command line
echo "# abpac-api-teste" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/ivcivc/abpac-api-teste.git
git push -u origin main
…or push an existing repository from the command line
git remote add origin https://github.com/ivcivc/abpac-api-teste.git
git branch -M main
git push -u origin main