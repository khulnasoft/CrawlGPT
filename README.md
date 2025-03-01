# Crawl GPT 🚀 <!-- omit from toc -->

![Build Status](https://img.shields.io/github/workflow/status/khulnasoft/crawlgpt/Node.js%20CI)
![Dependencies](https://img.shields.io/david/khulnasoft/crawlgpt)
![License](https://img.shields.io/github/license/khulnasoft/crawlgpt)
![Version](https://img.shields.io/github/v/release/khulnasoft/crawlgpt)

Crawl a site to generate knowledge files and create your own custom GPT from one or multiple URLs.

- [🔍 Example](#example)
- [🚀 Get Started](#get-started)
  - [Local Setup](#local-setup)
    - [Clone the Repository](#clone-the-repository)
    - [Install Dependencies](#install-dependencies)
    - [Configure the Crawler](#configure-the-crawler)
    - [Run Your Crawler](#run-your-crawler)
  - [💻 Alternative Methods](#alternative-methods)
    - [Docker Container](#docker-container)
    - [API Server](#api-server)
  - [⬆️ Upload Data to OpenAI](#upload-data-to-openai)
    - [Create a Custom GPT](#create-a-custom-gpt)
    - [Create a Custom Assistant](#create-a-custom-assistant)
- [💡 Contributing](#contributing)

---

## 🔍 Example

Here's a custom GPT I quickly created to answer questions about integrating [Khulnasoft](https://www.khulnasoft.com) by crawling the Builder docs.

- [Try it out yourself](https://chat.openai.com/g/g-kywiqipmR-builder-io-assistant) and ask about integrating Khulnasoft.com into your site!

> **Note**: You may need a paid ChatGPT plan to use custom GPTs.

---

## 🚀 Get Started

### Local Setup

#### Clone the Repository

Make sure you have **Node.js >= 16** installed.

```bash
git clone https://github.com/khulnasoft/crawlgpt
