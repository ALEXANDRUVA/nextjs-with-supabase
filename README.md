<div align="center">

# VimmoAI

### AI-assisted cinematic real estate visualization

Transforming property photos into structured, production-ready visual experiences for modern real estate marketing.

[Live Demo](https://nextjs-with-supabase-vimmoai.vercel.app) ·
[Demo Video](https://youtu.be/cMkal0Js-FE)) ·
[Development Status](#development-status)

</div>

---

## Overview

VimmoAI is an AI-assisted real estate visualization platform designed for real estate agents, property developers, and marketing professionals.

The platform helps users turn property images and project requirements into a structured cinematic video workflow.

Users can:

- create a secure account;
- submit a new real estate project;
- upload an original property image;
- select the property type and room or area;
- choose the desired visual style;
- define the video duration;
- select a camera movement;
- specify the intended marketing channel;
- track the project through a protected dashboard.

VimmoAI combines AI-assisted project preparation with human quality control.

The goal is not to replace professional judgment, but to make high-quality real estate visualization more structured, accessible, and scalable.

---

## The Problem

Professional real estate videos can require significant time, technical knowledge, and production resources.

Many real estate professionals have property photos but lack:

- cinematic presentation skills;
- experience writing AI video prompts;
- knowledge of camera movement and visual direction;
- a structured workflow for AI-generated content;
- reliable quality-control procedures.

Generic AI generation tools can also produce inconsistent results when users submit unclear instructions or repeatedly generate content without a defined production plan.

VimmoAI addresses this by guiding the user through a controlled project workflow before video production begins.

---

## The Solution

VimmoAI converts user selections and uploaded property media into structured production information.

Each project can include:

- property type;
- room or property area;
- preferred visual style;
- video duration;
- camera movement;
- intended usage;
- additional production instructions;
- original property image.

This information can then be analyzed and transformed into:

- a structured generation prompt;
- a negative prompt;
- recommended production settings;
- camera guidance;
- visual consistency instructions;
- internal quality-control criteria.

The platform is designed to reduce unnecessary AI generations and improve transparency throughout the production process.

---

## Current MVP Features

The current VimmoAI MVP includes:

- Supabase authentication;
- protected user routes;
- secure project creation;
- property image upload;
- image type and file-size validation;
- Supabase Storage integration;
- project ownership controls;
- project dashboard;
- individual project detail pages;
- project status tracking;
- configurable real estate project options;
- AI-assisted project analysis foundation;
- protected internal production fields;
- generated-video delivery structure;
- responsive user interface;
- Vercel deployment.

---

## Project Workflow

```text
User registration or login
        ↓
Create a new project request
        ↓
Select property and video preferences
        ↓
Upload the original property image
        ↓
Store the project securely in Supabase
        ↓
Prepare structured AI production guidance
        ↓
Review the project and generation settings
        ↓
Produce the real estate visualization
        ↓
Perform human quality control
        ↓
Release the approved video to the client
OpenAI GPT-5.6 Usage

GPT-5.6 was used during the OpenAI Build Week to support the intelligent project-preparation layer of VimmoAI.

The model processes structured project information such as:

property type;
selected room or property area;
preferred visual style;
requested video duration;
camera movement;
marketing destination;
additional client instructions.

The intended structured output includes:

a professional video-generation prompt;
a negative prompt;
recommended generation settings;
scene and camera guidance;
visual-preservation requirements;
quality-control recommendations.

GPT-5.6 is not presented as an autonomous replacement for professional review.

Its role is to organize project information, improve prompt quality, and support a more consistent production workflow.

Codex Usage

Codex supported the development, implementation, and debugging of the VimmoAI application.

It was used to assist with:

Next.js architecture;
TypeScript components;
Supabase authentication;
protected routes;
database queries;
secure image uploads;
Supabase Storage paths;
project ownership validation;
project creation forms;
dashboard development;
project status pages;
API route structure;
error handling;
deployment debugging;
UI refinement;
code review and refactoring.

Codex was used as a development assistant. Final decisions, project direction, testing, and quality evaluation remained under human control.

AI Transparency

VimmoAI is built around transparent and responsible AI-assisted production.

The platform does not claim that AI output is always mathematically perfect or free from visual artifacts.

AI-generated real estate content can contain:

altered architectural details;
inconsistent reflections;
object deformation;
lighting differences;
unexpected furniture changes;
visual artifacts;
differences between the original property and generated result.

For this reason, VimmoAI includes a human quality-control stage before final delivery.

The uploaded property image remains the primary visual reference throughout the workflow.

Generated results should be clearly identified as AI-assisted visualizations when used publicly or commercially.

Human Quality Control

The production workflow is designed around the principle:

AI assists the process. A human approves the result.

Before a completed video is released, it can be reviewed for:

architectural consistency;
visual realism;
image stability;
camera movement;
geometry preservation;
lighting consistency;
obvious AI artifacts;
suitability for real estate marketing.

This approach helps prevent unreviewed AI content from being delivered automatically to clients.

Future-Ready AI Architecture

AI models and video-generation systems evolve rapidly.

VimmoAI is designed so that the product workflow is not permanently tied to a single generation provider or model version.

The long-term architecture separates:

customer project data;
prompt preparation;
internal generation settings;
video-generation providers;
quality-control logic;
final client delivery.

This makes it possible to update or replace AI models as better technologies become available without redesigning the entire customer workflow.

The guiding principle is:

The platform should evolve with AI without hiding how AI is being used.

Technology Stack
Technology	Purpose
Next.js	Full-stack web application
React	User interface
TypeScript	Type-safe application development
Tailwind CSS	Responsive styling
Supabase Auth	User authentication
Supabase Database	Project and workflow storage
Supabase Storage	Property image and video storage
OpenAI GPT-5.6	AI-assisted project preparation
Codex	Development and debugging support
Kling AI	Planned video-generation workflow
Vercel	Hosting and deployment
Security and Data Structure

VimmoAI uses user-specific project ownership.

Each order is connected to an authenticated user through a user ID.

Uploaded property images follow a structured storage path:

USER_ID/ORDER_ID/FILENAME

The application validates that:

the user is authenticated;
the order belongs to the authenticated user;
the uploaded file path matches the user and order;
only supported image formats are accepted;
file-size limits are respected;
users can access only their own project information.

Sensitive environment variables are not stored directly in the public source code.

Supported Image Formats

The current upload workflow supports:

JPG;
PNG;
WebP.

Maximum upload size:

20 MB

For faster testing and more reliable uploads, files below approximately 6 MB are recommended.

Project Statuses

The project workflow can use statuses such as:

draft
image_uploaded
payment_pending
paid
prompt_processing
prompt_ready
video_queued
video_processing
quality_review
approved
delivered
failed
refunded

These statuses make it possible to separate customer requests, AI preparation, video production, quality review, and final delivery.

Development Status

VimmoAI is currently a functional MVP and remains under active development.

Due to the limited hackathon timeframe, development focused on demonstrating the core product workflow:

authentication;
secure project creation;
property image upload;
database and storage integration;
AI-assisted project preparation;
dashboard tracking;
project status management;
human quality-control structure.

The following features are not yet fully completed:

fully automated end-to-end Kling AI generation;
automatic multi-scene video assembly;
complete payment integration;
automated credit and generation-cost calculation;
advanced administrator production controls;
automated client notifications;
production-level monitoring and analytics.

Some video-generation and quality-control steps are currently handled manually.

The current MVP demonstrates the technical foundation, user experience, product vision, and practical use of GPT-5.6 and Codex.

Roadmap
Phase 1 — Functional MVP
authentication;
project creation;
secure image upload;
dashboard;
project detail page;
AI-assisted project preparation;
status tracking.
Phase 2 — Video Production Integration
Kling AI API integration;
generation job creation;
provider-status synchronization;
generation-error handling;
video preview;
internal approval controls.
Phase 3 — Payments and Credits
Stripe integration;
project pricing;
credit calculation;
generation-cost protection;
payment status synchronization;
invoices and order history.
Phase 4 — Production Platform
administrator dashboard;
project review tools;
client notifications;
multi-scene video workflows;
advanced quality scoring;
generation analytics;
multilingual support;
additional AI providers.
Local Development
Requirements
Node.js;
npm;
a Supabase project;
an OpenAI API key for AI functionality.

Clone the repository:

git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME

Install dependencies:

npm install

Create a local environment file:

cp .env.example .env.local

Add the required environment variables:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
OPENAI_API_KEY=your_openai_api_key

Never commit real API keys or service-role credentials to the repository.

Start the development server:

npm run dev

Open:

http://localhost:3000

Create a production build:

npm run build
Demo
Live Application
YOUR_LIVE_APP_URL
Demo Video
YOUR_DEMO_VIDEO_URL

Demo credentials should be provided privately through the Devpost judging instructions rather than stored in this public README.

Responsible Use

VimmoAI should be used only with images that the user owns or is authorized to process.

Users are responsible for:

obtaining the required image rights;
checking generated content before publication;
disclosing AI-generated or AI-assisted visualizations where required;
avoiding misleading property representation;
complying with applicable advertising, copyright, privacy, and real estate regulations.
Product Philosophy

VimmoAI is based on three principles:

Transparency

The platform should clearly communicate what AI can and cannot guarantee.

Control

Users should define the project before generation begins instead of generating content without structure.

Quality

AI output should be reviewed before being delivered or published.

Founder

VimmoAI was created by Vasilica Alexandru Cozma as an independent AI real estate visualization project developed in Germany.

The project is being built gradually, transparently, and with a focus on practical value for real estate professionals.

License

This repository is currently provided for hackathon evaluation and project demonstration.

Commercial use, redistribution, or reuse of VimmoAI branding, proprietary workflows, or application-specific business logic is not permitted without written authorization.

<div align="center">
VimmoAI

AI-assisted real estate visualization with human quality control

Built with Next.js, Supabase, OpenAI GPT-5.6, Codex, and Vercel.


