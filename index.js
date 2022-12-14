#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import shell from "shelljs";
import { exec, execSync } from "child_process";
function isCurrentUserRoot() {
  return process.getuid() == 0; // UID 0 is always root
}
const init = () => {


  console.log(
    chalk.redBright(
      figlet.textSync("- C64 /Alfred -", {
        // font: "Ghost",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  );
  console.log(
    chalk.green(
      'server manager'
    )
  );
};
const askTasks = async () => {
  const questions = [
    {
      type: "list",
      name: "TASK",
      message: "What do you want to do?",
      choices: [
        { name: "Install Nginx", value: "nginx" },
        { name: "Install MongoDB", value: "mongo" },
        { name: "Install Certbot 'for https with nginx' ", value: "certbot" },
        { name: "Create Nginx Website Config (Nodejs,React,..)", value: "config" },
        { name: "HTTPS on website on already configured nginx config", value: "letsencrypt" }
      ]
    }
  ];
  return inquirer.prompt(questions);
}

const askConfig = async () => {
  const questions = [
    {
      type: "input",
      name: "DOMAIN",
      message: "What is the domain of the website? ex: c64.ae, backend.c64.ae",
      validate: function (val) {
        //check if input is valid domain
        if (val.match(/^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/)) {
          return true;
        }
        return "Not a valid domain 🙃";
      }

    },
    {
      type: "input",
      name: "PORT",
      message: "What is the port of the running service ? ex: 3000",
      validate: function (val) {
        //check if port number is valid
        if (val.match(/^[0-9]+$/)) {
          return true;
        }
        return "Not a valid port number 🙃";
      }
    }
  ];
  return inquirer.prompt(questions);
}
const askConfigType = async () => {
  const questions = [
    {
      type: "list",
      name: "TYPE",
      message: "What type of website do you want to create?",
      choices: [
        { name: "Nodejs, port forwarding ? backend, ssr, any thing running on port !", value: "nodejs" },
        { name: "React", value: "react" },
        { name: "HTML", value: "html" }
      ]
    }
  ];
  return inquirer.prompt(questions);
}
const askCertbot = async () => {
  const questions = [
    {
      type: "list",
      name: "CERTBOT",
      message: "Do you want to add certbot?",
      choices: [
        { name: "Yes", value: "yes" },
        { name: "No", value: "no" }
      ]
    }]
  return inquirer.prompt(questions);
};

const askConfigReact = async () => {
  const questions = [
    {
      type: "input",
      name: "DOMAIN",
      message: "What is the domain of the website? ex: c64.ae, backend.c64.ae",
      validate: function (val) {
        //check if input is valid domain
        if (val.match(/^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/)) {
          return true;
        }
        return "Not a valid domain 🙃";
      },
    },
    //root folder
    {
      type: "input",
      name: "ROOT",
      message: "What is the root folder of the website? ex: /home/website/build/",

    }
  ];
  return inquirer.prompt(questions);
}
const askEmail = async () => {
  const questions = [
    {
      type: "input",
      name: "EMAIL",
      message: "What is your email address?",
    }];
  return inquirer.prompt(questions);
}
const askDomain = async () => {
  const questions = [
    {
      type: "input",
      name: "DOMAIN",
      message: "What is the domain of the website? ex: c64.ae, backend.c64.ae",
    }];
  return inquirer.prompt(questions);
}
// const createFile = (filename, extension) => {
//   const filePath = `${process.cwd()}/${filename}.${extension}`
//   shell.touch(filePath);
//   return filePath;
// };

const success = () => {
  console.log(
    chalk.white.bgGreen.bold(`Script ran successfully!`)
  );
};

const run = async () => {
  // show script introduction
  init();
  if (!isCurrentUserRoot()) {
    //evil emoji
    console.log(chalk.red.bold("You must run this script as root"));
    return;
  }

  // ask questions
  const answers = await askTasks();
  const { TASK } = answers;
  if (TASK === "nginx") {
    await installNginx();
  }
  if (TASK === "mongo") {
    await installMongoDB();
  }
  if (TASK === "certbot") {
    await installCertBot();
  }
  if (TASK === "config") {
    const { TYPE } = await askConfigType();

    let fileContent = ''
    let filePath = ''
    let domain = ''
    if (TYPE === "nodejs") {
      const { DOMAIN, PORT } = await askConfig();
      domain = DOMAIN;
      fileContent = `server {
        server_name ${DOMAIN};
        
        location / {
          proxy_set_header   X-Forwarded-For $remote_addr;
          proxy_set_header   Host $http_host;
          proxy_pass         http://localhost:${PORT};
        }
        listen 80;
      }`;
      filePath = `/etc/nginx/sites-enabled/${DOMAIN}`;
    }
    if (TYPE === "react") {
      const { DOMAIN, ROOT } = await askConfigReact();
      domain = DOMAIN;
      fileContent = `server {

        root ${ROOT};
        index index.html index.htm index.nginx-debian.html;

        server_name ${DOMAIN};
        location / {
    try_files $uri /index.html;
        }
    listen 80;
      }`;
      filePath = `/etc/nginx/sites-enabled/${DOMAIN}`;
    }


    shell.touch(filePath);
    shell.ShellString(fileContent).to(filePath);
    execSync(`sudo service nginx reload`);
    // shell.touch(filePath);
    // shell.sed('-i', '{{DOMAIN}}', DOMAIN, filePath);
    // shell.sed('-i', '{{PORT}}', PORT, filePath);
    const { CERTBOT } = await askCertbot();
    if (CERTBOT === "yes") {
      const { EMAIL } = await askEmail();
      await addCertificate(domain, EMAIL);
    }
    success(filePath);
  }
  if (TASK === "letsencrypt") {
    const { DOMAIN } = await askDomain();
    const { EMAIL } = await askEmail();
    await addCertificate(DOMAIN, EMAIL);
  }

  // show success message
  success();
};
const installNginx = async () => {

  execSync("sudo apt-get install nginx -y ");
}
const installMongoDB = async () => {

  execSync("sudo apt-get install nginx -y ");
}
const installCertBot = async () => {
  // sudo apt install certbot python3-certbot-nginx
  execSync("sudo apt install certbot python3-certbot-nginx -y ");
}
const addCertificate = async (domain, email) => {
  //certbot --nginx -d DOMAIN --agree-tos -m muebarakat@gmail.com
  execSync(`certbot --nginx -d ${domain} --agree-tos -m ${email}`);
}


run();