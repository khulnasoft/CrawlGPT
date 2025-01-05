#!/bin/bash

# copy the config when starting the container
cp /home/data/config.ts /home/crawlgpt/

# start the crawler
cd /home/crawlgpt && npm start

# Print message after crawling and exit
echo "Crawling complete.."
exit