const Version = "1.0.1";
const lastShortcut = "https://www.icloud.com/shortcuts/fe6b4723905747e18fc21bc96ba9674d";
const express = require("express");
const https = require("https");
const http = require("http")
const fs = require("fs");
const ejs = require("ejs");
const path = require("path");
const multer = require("multer");
const { Skolengo } = require('scolengo-api');
const { compile } = require('html-to-text');
const { v4: uuidv4 } = require('uuid');
const useragent = require('express-useragent');

const app = express();


const options = {
  key: fs.readFileSync('SSL/private.key'),
  cert: fs.readFileSync('SSL/certificate.crt'),
  ca: fs.readFileSync('SSL/ca_bundle.crt')
};
const server = https.createServer(options, app);
app.listen(443, () => {
  console.log("Le serveur Express écoute sur le port 443 (HTTPS).");
});

//Si vous voulez utilisez https remplacer à la ligne 23 app -> server.  Créer un dossier SSL et y mettre les fichier du certificat
//PS : si il vous faut changez le nom des fichier le tableau options à la ligne 17 est là pour vous 😉

const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
});

httpServer.listen(80, () => {
  console.log("Le serveur Express écoute sur le port 80 (HTTP) pour effectuer la redirection.");
});

app.use(express.static("public"));
app.use(useragent.express());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/authentication", (req, res) => {
  res.sendFile(path.join(__dirname, "public/authentication.html"));
});

app.get("/download", (req, res) => {
  res.sendFile(path.join(__dirname, "public/download.html"));
});

app.get("/documentation", (req, res) => {
  res.sendFile(path.join(__dirname, "public/documentation.html"));
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, "config.json");
  },
});

const upload = multer({ storage: storage });

app.engine("html", ejs.__express);
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "html");
app.set("views", path.join(__dirname, "views"));

app.get('/api/gethomework/:token/:date/:twodate/:nolink', async (req, res) => {
  try {
    fs.appendFile("log.txt", `\n\n${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })} : Gethomework`, 'utf8', (err) => {
      if (err) {
        console.error('Erreur lors de l\'écriture du fichier :', err);
      }
    });
    const fichierJSON = JSON.parse(fs.readFileSync('user.json', 'utf8'));
    const JSONtoken = String(req.params.token);

    if (!fichierJSON[JSONtoken]) {
      return res.json({ error: "Invalid Token !" });
    }
    const config = fichierJSON[JSONtoken];
    const user = await Skolengo.fromConfigObject(config);
    const studentId = user.getUserInfo().id;

    if (req.params.twodate == "false") {
      console.log("1")
      const agenda = await user.getAgenda(studentId, req.params.date, req.params.date);
      const result = [];
      for (const seanceDeCours of agenda) {
        for (const devoir of seanceDeCours.homeworkAssignments) {
          const string = new Date(devoir.dueDateTime).toLocaleString();
          const [DATE, TIME] = string.split(" ");
          if (req.params.nolink == "true") {
            result.push({
              subject: devoir.subject.label,
              title: devoir.title,
              date: DATE,
              time: TIME,
              exercice:  [devoir.html].map(compile({ wordwrap: 130 })).join('\n').replace(/(\n|\[.*?\])/g, ' '),
              done: devoir.done
            });
          } else {
            result.push({
              subject: devoir.subject.label,
              title: devoir.title,
              date: DATE,
              time: TIME,
              exercice:  [devoir.html].map(compile({ wordwrap: 130 })).join('\n').replace(/\n/g, " "),
              done: devoir.done
            });
          }
        }
      }
      const resultatModifie = result.map((devoir, index) => {
        return {
          [`homework${index+1}`]: devoir
        };
      });
      resultatModifie.push({ number: result.length });
      const resultatFinal = Object.assign({}, ...resultatModifie);
      return res.json(resultatFinal);
    } else {
      console.log("2")
      const agenda = await user.getAgenda(studentId, req.params.date, req.params.twodate);
      const result = [];
      for (const seanceDeCours of agenda) {
        for (const devoir of seanceDeCours.homeworkAssignments) {
          const string = new Date(devoir.dueDateTime).toLocaleString();
          const [DATE, TIME] = string.split(" ");
          if (req.params.nolink == "true") {
            result.push({
              subject: devoir.subject.label,
              title: devoir.title,
              date: DATE,
              time: TIME,
              exercice:  [devoir.html].map(compile({ wordwrap: 130 })).join('\n').replace(/(\n|\[.*?\])/g, ' '),
              done: devoir.done
            });
          } else {
            result.push({
              subject: devoir.subject.label,
              title: devoir.title,
              date: DATE,
              time: TIME,
              exercice:  [devoir.html].map(compile({ wordwrap: 130 })).join('\n').replace(/\n/g, " "),
              done: devoir.done
            });
          }
        }
      }
      const resultatModifie = result.map((devoir, index) => {
        return {
          [`homework${index+1}`]: devoir
        };
      });
      resultatModifie.push({ number: result.length });
      const resultatFinal = Object.assign({}, ...resultatModifie);
      return res.json(resultatFinal);
    }
  } catch (error) {
    return res.json({ error: "Une erreur s'est produite, merci de la reporter : " + error });
  }
});

app.get('/api/getagenda/:token/:date/:twodate', async (req, res) => {
  try {
    fs.appendFile("log.txt", `\n\n${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })} : Getagenda`, 'utf8', (err) => {});
    const fichierJSON = JSON.parse(fs.readFileSync('user.json', 'utf8'));
    const JSONtoken = String(req.params.token);
    if (!fichierJSON[JSONtoken]) {
      return res.json({ error: "Invalid Token !" });
    }
    const config = fichierJSON[JSONtoken];
    const user = await Skolengo.fromConfigObject(config);
    const studentId = user.getUserInfo().id;
    if (!req.params.twodate == false) {
      console.log("1")
      const agenda = await user.getAgenda(studentId, req.params.date, req.params.date);
      const result = [];
      for (const seanceDeCours of agenda) {
        for (const lesson of seanceDeCours.lessons) {
          const string = new Date(lesson.startDateTime).toLocaleString();
          const [DATE, TIME] = string.split(" ");
          result.push({
            Lesson:lesson.subject.label,
            Date:DATE,
            Time:TIME
          });
        }
      }
      const resultatModifie = result.map((agenda, index) => {
        return {
          [`agenda${index+1}`]: agenda
        };
      });
      resultatModifie.push({ number: result.length });
      const resultatFinal = Object.assign({}, ...resultatModifie);
      return res.json(resultatFinal);
    } else {
      console.log("2")
      const agenda = await user.getAgenda(studentId, req.params.date, req.params.twodate);
      const result = [];
      for (const seanceDeCours of agenda) {
        for (const lesson of seanceDeCours.lessons) {
          const string = new Date(lesson.startDateTime).toLocaleString();
          const [DATE, TIME] = string.split(" ");
          result.push({
            lesson:lesson.subject.label,
            date:DATE,
            time:TIME
          });
        }
      }
      const resultatModifie = result.map((lesson, index) => {
        return {
            [`lesson${index+1}`]: lesson
        };
      });
      resultatModifie.push({ number: result.length });
      const resultatFinal = Object.assign({}, ...resultatModifie);
    }
  } catch (error) {
    return res.json({ error: "Une erreur s'est produite, merci de la reporter : " + error });
  }
});

app.get('/api/version', async (req, res) => {
  res.json({"version": Version});
});

app.get('/api/lastshortcut', async (req, res) => {
  res.json({"lastshortcut": lastShortcut});
});

app.get('/api/getevaluation/:token/:periodid/:average', async (req, res) => {
  fs.appendFile("log.txt", `\n\n${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })} : Getevalution`, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier :', err);
    }
  });
  const fichierJSON = JSON.parse(fs.readFileSync('user.json', 'utf8'));
  const JSONtoken = String(req.params.token);

  if (!fichierJSON[JSONtoken]) {
    return res.json({ error: "Invalid Token !" });
  }
  if (!isNaN(req.params.periodid)) {
    if (req.params.average == "false") {
      const config = fichierJSON[JSONtoken];
      const user = await Skolengo.fromConfigObject(config);
      const studentId = user.getUserInfo().id;
      const Evaluation = await user.getEvaluation(studentId, req.params.periodid, 20, 0)
      console.log(Evaluation)
      var timer = 0
      let result = []
      for (const key in Evaluation) {
        if (Evaluation[key].studentAverage !== null) {
          timer++
          result.push({
            average:Evaluation[key].studentAverage,
            subject:Evaluation[key].subject.label,
            teacher:Evaluation[key].teachers[0].title+" "+Evaluation[key].teachers[0].lastName+" "+Evaluation[key].teachers[0].firstName
          });
        }
      }
      const resultatModifie = result.map((eval, index) => {
        return {
          [`evaluation${index+1}`]: eval
        };
      });
      resultatModifie.push({ number: result.length });
      const resultatFinal = Object.assign({}, ...resultatModifie);
      return res.json(resultatFinal)
    } else {
      const config = fichierJSON[JSONtoken];
      const user = await Skolengo.fromConfigObject(config);
      const studentId = user.getUserInfo().id;
      const Evaluation = await user.getEvaluation(studentId, req.params.periodid, 20, 0)
      console.log(Evaluation)
      var average = 0
      var timer = 0
      for (const key in Evaluation) {
        if (Evaluation[key].studentAverage !== null) {
          timer++
          average = average + Evaluation[key].studentAverage
        }
      }

      const nombre = average/timer;
      const nombreArrondi = nombre.toFixed(2);
      res.json({"average": nombreArrondi})
    }
  } else {
    res.json({"error": "periodId n'est pas un nombre"})
  }
});

async function refreshToken() {
  fs.appendFile("log.txt", `\n\n${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })} : Refresh Token...`, 'utf8', (err) => {});
  try {
    const contenuFichier = fs.readFileSync("user.json", 'utf8');
    const obj = JSON.parse(contenuFichier);
    const promises = [];
    for (const cle in obj) {
      if (obj.hasOwnProperty(cle)) {
        const promise = Skolengo.fromConfigObject(obj[cle])
        .then(async user => {
          const newToken = await user.refreshToken();
          obj[cle].tokenSet = newToken;
        });
        promises.push(promise);
      }
    }
    await Promise.all(promises);
    fs.writeFileSync('user.json', JSON.stringify(obj, null, 2), 'utf8');
  } catch (erreur) {
    console.error('Une erreur s\'est produite lors de la lecture du fichier JSON :', erreur);
  }
}
setInterval(refreshToken, 3600000);

app.use(express.json());
app.post('/uploadtoken', (req, res) => {
  var newUuid = uuidv4();
  fs.appendFile("log.txt", `\n\n${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })} : Register`, 'utf8', (err) => {});
  const data = req.body;
  let myTable = [];
  fs.readFile('user.json', 'utf8', (err, userJson) => {
    if (err) {
      return;
    }
    myTable = JSON.parse(userJson);
    Skolengo.fromConfigObject(data).then(async user => {
      const infoUser = await user.getUserInfo()
      ID = infoUser.id
      const promises = [];
      for (const key in myTable) {
        promises.push(
          Skolengo.fromConfigObject(myTable[key]).then(async user => {
            if (ID == (await user.getUserInfo()).id) {
              delete myTable[key];
            }
          })
        );
      }
      Promise.all(promises)
      .then(() => {
        myTable[newUuid] = data;
        fs.writeFileSync('user.json', JSON.stringify(myTable, null, 2), 'utf8');
        var reponse = { "token" : newUuid }
        res.status(200).json(reponse);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
      });
    });
  });
});


app.get('/api/getperiodid/:token', async (req, res) => {
  fs.appendFile("log.txt", `\n\n${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })} : Getevalution`, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier :', err);
    }
  });
  const fichierJSON = JSON.parse(fs.readFileSync('user.json', 'utf8'));
  const JSONtoken = String(req.params.token);

  if (!fichierJSON[JSONtoken]) {
    return res.json({ error: "Invalid Token !" });
  }
  const config = fichierJSON[JSONtoken];
  const user = await Skolengo.fromConfigObject(config);
  const studentId = user.getUserInfo().id;
  const EvaluationSetting = await user.getEvaluationSettings(studentId)
  res.json({"periodID": EvaluationSetting[0].periods[0].id})
  })
