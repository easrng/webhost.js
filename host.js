function serveWithHttp(servers, app) {
        return new Promise(function(resolve, reject) {
            if ("function" !== typeof app) {
                reject(
                    new Error(
                        "glx.serveApp(app) expects a node/express app in the format `function (req, res) { ... }`"
                    )
                );
                return;
            }

            var id = false;
            var idstr = (id && "#" + id + " ") || "";
            var plainServer = servers.httpServer(app);
            var plainAddr = "0.0.0.0";
            var plainPort = 80;
            plainServer.listen(plainPort, plainAddr, function() {
                console.info(
                    idstr + "Listening on",
                    plainAddr + ":" + plainPort,
                    "for ACME challenges, and redirecting to HTTPS"
                );

                // TODO fetch greenlock.servername
                let _middlewareApp = app;
                var secureServer = servers.httpsServer(null, app);
                var secureAddr = "0.0.0.0";
                var securePort = 443;
                secureServer.listen(securePort, secureAddr, function() {
                    console.info(idstr + "Listening on", secureAddr + ":" + securePort, "for secure traffic");
                    resolve();
                });
            });
        });
    };
const express = require('express')
const fs = require('fs').promises
let app = express()
const { spawn } = require("child_process");

app.get("/_pull", function(req, res) {
  if (req.headers['host'].indexOf("/") != -1) return res.end();
  const ps = spawn("sh", ["-c",`cd /home/pi/sites/${req.headers['host']}; git pull origin master`]);
  ps.stdout.on("data", data => {
    res.write(data);
  });

  ps.stderr.on("data", data => {
    res.write(data);
  });

  ps.on("close", code => {
    res.end();
  });

  // echo incoming data to test whether POST request works
  res.status(200);
  res.header("content-type", "text/plain");
});

app.use(async (req,res,next)=>{
  try{
    if(req.headers["host"].indexOf("/")!=-1)throw new Error();
    try{
      await fs.access("/home/pi/sites/"+req.headers["host"])
    }catch(e){
      return next()
    }
    return express.static("/home/pi/sites/"+req.headers["host"])(req,res,next)
  }catch(e){
    console.error(e)
    next()
  }
})

app.use(express.static("/home/pi/sites/default"))

require("greenlock-express")
    .init({
        packageRoot: "/home/pi/sites/",
        configDir: "./greenlock.d",
        maintainerEmail: process.env.MAINTAINER_EMAIL,
        // whether or not to run at cloudscale
        cluster: false
    })
    // Serves on 80 and 443
    .ready(servers=>serveWithHttp(servers,app))
