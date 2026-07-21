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
