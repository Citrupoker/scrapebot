#!/bin/bash
sudo apt-get update
sudo apt-get --assume-yes install nodejs-legacy 
sudo apt-get --assume-yes install npm
sudo apt-get --assume-yes install xvfb x11-xkb-utils xfonts-100dpi xfonts-75dpi xfonts-scalable xfonts-cyrillic x11-apps clang libdbus-1-dev libgtk2.0-dev libnotify-dev libgnome-keyring-dev libgconf2-dev libasound2-dev libcap-dev libcups2-dev libxtst-dev libxss1 libnss3-dev gcc-multilib g++-multilib
sudo apt-get --assume-yes install git
git config --global user.name "Evans Enonchong"
git config --global user.email "evansenonchong@hotmail.com"
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list
sudo apt-get update
sudo apt-get install -y mongodb-org
npm install -g electron
npm install -g forever
cd ~
git clone https://Citrubit@bitbucket.org/citrudev/kicks.git sneakerMonitor
cd sneakerMonitor
npm install
xvfb-run "forever start" kicksbot.js



