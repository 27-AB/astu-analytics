import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";

// Shared interfaces
interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "researcher" | "viewer";
  college: string;
  isActive: boolean;
  createdAt: string;
}

interface ResearchProject {
  _id: string;
  title: string;
  lead: string;
  college: string;
  department: string;
  status: "active" | "paused" | "completed" | "planned" | "under_review" | "rejected";
  startDate: string;
  endDate: string;
  fundingETB: number;
  fundingSource: string;
  tags: string[];
  summary: string;
  publications: number;
  teamSize: number;
  centerOfExcellence: string;
  ownerId?: string;
  createdAt: string;
}

interface CommunityProject {
  _id: string;
  title: string;
  lead: string;
  college: string;
  status: "active" | "paused" | "completed" | "planned";
  startDate: string;
  endDate: string;
  budgetETB: number;
  location: string;
  beneficiaries: number;
  volunteers: number;
  tags: string[];
  summary: string;
  impact: string;
  createdAt: string;
}

interface College {
  _id: string;
  name: string;
  shortName: string;
  dean: string;
  established: number;
  departments: string[];
  description: string;
  color: string;
}

interface Researcher {
  _id: string;
  name: string;
  title: string;
  college: string;
  department: string;
  email: string;
  specialization: string[];
  publications: number;
  activeProjects: number;
}

// In-Memory Database Store (Stateful fallbacks)
const DB_STORE = {
  users: [] as User[],
  researchProjects: [] as ResearchProject[],
  communityProjects: [] as CommunityProject[],
  colleges: [] as College[],
  researchers: [] as Researcher[],
  aiCache: new Map<string, string>(),
};

// Seed initial in-memory data
const DEFAULT_USERS_SEED: User[] = [
  {
    _id: "u_admin",
    name: "Abebe Kebede",
    email: "admin@astu.edu.et",
    passwordHash: bcrypt.hashSync("admin1234", 12),
    role: "admin",
    college: "Administration",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "u_researcher",
    name: "Dr. Tigist Alemu",
    email: "researcher@astu.edu.et",
    passwordHash: bcrypt.hashSync("research1234", 12),
    role: "researcher",
    college: "College of Electrical Engineering & Computing",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "u_viewer",
    name: "Dawit Haile",
    email: "viewer@astu.edu.et",
    passwordHash: bcrypt.hashSync("viewer1234", 12),
    role: "viewer",
    college: "College of Applied Natural Science",
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_COLLEGES_SEED: College[] = [
  {
    _id: "col_1",
    name: "College of Electrical Engineering & Computing",
    shortName: "CEEC",
    dean: "Prof. Girma Tesfaye",
    established: 1993,
    color: "#3b82f6",
    departments: ["Computer Science & Engineering", "Electrical & Computer Engineering", "Software Engineering", "Information Technology", "Computer Networks"],
    description: "The largest college at ASTU, leading research and education in computing, software, and electrical systems for Ethiopia's digital transformation."
  },
  {
    _id: "col_2",
    name: "College of Mechanical, Chemical & Materials Engineering",
    shortName: "CMCME",
    dean: "Prof. Almaz Tadesse",
    established: 1994,
    color: "#f59e0b",
    departments: ["Mechanical Engineering", "Chemical Engineering", "Materials Science & Engineering", "Industrial Engineering", "Manufacturing Engineering"],
    description: "Advancing engineering solutions in manufacturing, energy, materials and industrial processes to drive Ethiopia's industrialisation agenda."
  },
  {
    _id: "col_3",
    name: "College of Civil Engineering and Architecture",
    shortName: "CCEA",
    dean: "Dr. Biruk Hailu",
    established: 1995,
    color: "#10b981",
    departments: ["Civil Engineering", "Architecture", "Urban & Regional Planning", "Construction Technology & Management", "Geotechnical Engineering"],
    description: "Building Ethiopia's future through excellence in infrastructure design, urban planning, and sustainable construction practices."
  },
  {
    _id: "col_4",
    name: "College of Applied Natural Science",
    shortName: "CANS",
    dean: "Prof. Mekdes Bekele",
    established: 1996,
    color: "#8b5cf6",
    departments: ["Mathematics", "Physics", "Chemistry", "Biology & Biotechnology", "Statistics", "Earth Sciences", "Environmental Science"],
    description: "Providing foundational and applied science education supporting research across all engineering and health disciplines at ASTU."
  },
  {
    _id: "col_5",
    name: "College of Humanities and Social Science",
    shortName: "CHSS",
    dean: "Dr. Nardos Hailu",
    established: 2004,
    color: "#06b6d4",
    departments: ["Sociology", "Psychology", "History", "Journalism & Communication", "Ethiopian Languages & Literature", "Foreign Languages", "Civics & Ethical Studies"],
    description: "Developing critical thinkers and communicators who bridge the gap between technology and society at Adama Science and Technology University."
  },
  {
    _id: "col_6",
    name: "Postgraduate Programs",
    shortName: "PG",
    dean: "Prof. Getachew Mengistu",
    established: 2005,
    color: "#ef4444",
    departments: ["MSc Computer Science", "MSc Electrical Engineering", "MSc Civil Engineering", "MSc Applied Mathematics", "PhD Engineering", "MSc Environmental Science", "MBA"],
    description: "ASTU's graduate school offering advanced MSc and PhD programmes across all engineering and applied science disciplines."
  }
];

const DEFAULT_RESEARCHERS_SEED: Researcher[] = [
  { _id: "res_1", name: "Dr. Tesfaye Worku", title: "Dr.", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", email: "tesfaye.worku@astu.edu.et", specialization: ["Artificial Intelligence", "Computer Vision", "Machine Learning"], publications: 18, activeProjects: 3 },
  { _id: "res_2", name: "Prof. Almaz Tadesse", title: "Prof.", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", email: "almaz.tadesse@astu.edu.et", specialization: ["Water Treatment", "Solar Energy", "Environmental Engineering"], publications: 32, activeProjects: 2 },
  { _id: "res_3", name: "Dr. Biruk Hailu", title: "Dr.", college: "College of Civil Engineering and Architecture", department: "Civil Engineering", email: "biruk.hailu@astu.edu.et", specialization: ["Structural Engineering", "Seismic Analysis", "Urban Infrastructure"], publications: 14, activeProjects: 2 },
  { _id: "res_4", name: "Dr. Yonas Girma", title: "Dr.", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", email: "yonas.girma@astu.edu.et", specialization: ["Blockchain", "Distributed Systems", "Cybersecurity"], publications: 11, activeProjects: 1 },
  { _id: "res_5", name: "Prof. Mekdes Bekele", title: "Prof.", college: "College of Applied Natural Science", department: "Biology & Biotechnology", email: "mekdes.bekele@astu.edu.et", specialization: ["Genomics", "Biotechnology", "Plant Science"], publications: 41, activeProjects: 2 },
  { _id: "res_6", name: "Dr. Solomon Bekele", title: "Dr.", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", email: "solomon.bekele@astu.edu.et", specialization: ["Renewable Energy", "Wind Power", "Power Systems"], publications: 22, activeProjects: 1 },
  { _id: "res_7", name: "Dr. Hana Tesfaye", title: "Dr.", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", email: "hana.tesfaye@astu.edu.et", specialization: ["Natural Language Processing", "Amharic NLP", "Deep Learning"], publications: 15, activeProjects: 2 },
  { _id: "res_8", name: "Prof. Getachew Mengistu", title: "Prof.", college: "College of Applied Natural Science", department: "Earth Sciences", email: "getachew.mengistu@astu.edu.et", specialization: ["Geothermal Energy", "Geology", "Geophysics"], publications: 38, activeProjects: 1 },
  { _id: "res_9", name: "Dr. Robel Tadesse", title: "Dr.", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", email: "robel.tadesse@astu.edu.et", specialization: ["IoT", "Smart Systems", "Embedded Systems"], publications: 9, activeProjects: 2 },
  { _id: "res_10", name: "Dr. Chaltu Wakjira", title: "Dr.", college: "College of Applied Natural Science", department: "Biology & Biotechnology", email: "chaltu.wakjira@astu.edu.et", specialization: ["Ethnopharmacology", "Traditional Medicine", "Drug Discovery"], publications: 19, activeProjects: 2 },
  { _id: "res_11", name: "Dr. Fikirte Haile", title: "Dr.", college: "College of Applied Natural Science", department: "Environmental Science", email: "fikirte.haile@astu.edu.et", specialization: ["Remote Sensing", "Climate Change", "GIS"], publications: 16, activeProjects: 2 },
  { _id: "res_12", name: "Prof. Dawit Asfaw", title: "Prof.", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", email: "dawit.asfaw@astu.edu.et", specialization: ["Biogas", "Waste-to-Energy", "Anaerobic Digestion"], publications: 27, activeProjects: 1 },
  { _id: "res_13", name: "Dr. Selamawit Girma", title: "Dr.", college: "College of Humanities and Social Science", department: "Sociology", email: "selamawit.girma@astu.edu.et", specialization: ["Entrepreneurship", "Women Empowerment", "Development Economics"], publications: 12, activeProjects: 1 },
  { _id: "res_14", name: "Prof. Tesfaye Demissie", title: "Prof.", college: "College of Humanities and Social Science", department: "Journalism & Communication", email: "tesfaye.demissie@astu.edu.et", specialization: ["Media Studies", "Digital Communication", "Public Relations"], publications: 21, activeProjects: 1 },
];

const DEFAULT_RESEARCH_PROJECTS: ResearchProject[] = [
  { _id: "rp_1", title: "AI-Powered Crop Disease Detection Using Deep Learning", lead: "Dr. Tesfaye Worku", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "active", startDate: "2023-02-01", endDate: "2025-01-31", fundingETB: 850000, fundingSource: "Ethiopian Science and Technology Commission", tags: ["AI", "agriculture", "deep learning"], summary: "Developing a mobile-first deep learning system to detect crop diseases from smartphone photos, targeting smallholder farmers in Oromia region.", publications: 3, teamSize: 7, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)", createdAt: new Date().toISOString() },
  { _id: "rp_2", title: "Solar-Powered Water Purification for Rural Ethiopia", lead: "Prof. Almaz Tadesse", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", status: "active", startDate: "2022-09-01", endDate: "2025-08-31", fundingETB: 1200000, fundingSource: "World Bank / MoSHE", tags: ["solar energy", "water purification", "rural development"], summary: "Designing low-cost solar-driven water treatment units deployable in off-grid communities, with pilot testing in Afar and SNNP regions.", publications: 5, teamSize: 9, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)", createdAt: new Date().toISOString() },
  { _id: "rp_3", title: "Seismic Risk Assessment of Adama Urban Infrastructure", lead: "Dr. Biruk Hailu", college: "College of Civil Engineering and Architecture", department: "Civil Engineering", status: "active", startDate: "2023-06-01", endDate: "2026-05-31", fundingETB: 2100000, fundingSource: "Ethiopian Disaster Risk Management Commission", tags: ["seismic", "urban planning", "infrastructure"], summary: "Comprehensive seismic vulnerability mapping of Adama city buildings using GIS, field surveys, and finite element modelling.", publications: 2, teamSize: 6, centerOfExcellence: "None", createdAt: new Date().toISOString() },
  { _id: "rp_4", title: "Blockchain-Based Land Registry System for Ethiopia", lead: "Dr. Yonas Girma", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "active", startDate: "2024-01-15", endDate: "2026-01-14", fundingETB: 950000, fundingSource: "Ministry of Innovation and Technology", tags: ["blockchain", "land registry", "governance"], summary: "Prototyping a tamper-proof, decentralised land ownership record system to reduce disputes and corruption in land administration.", publications: 1, teamSize: 5, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)", createdAt: new Date().toISOString() },
  { _id: "rp_5", title: "Teff Genome Sequencing and Nutritional Enhancement", lead: "Prof. Mekdes Bekele", college: "College of Applied Natural Science", department: "Biology & Biotechnology", status: "active", startDate: "2022-03-01", endDate: "2025-02-28", fundingETB: 1750000, fundingSource: "Bill & Melinda Gates Foundation", tags: ["genomics", "teff", "nutrition", "biotechnology"], summary: "Full genome sequencing of 12 teff varieties to identify genes linked to high iron and zinc content for nutritional improvement.", publications: 8, teamSize: 11, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)", createdAt: new Date().toISOString() },
  { _id: "rp_6", title: "Wind Energy Potential Mapping of Ethiopian Rift Valley", lead: "Dr. Solomon Bekele", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", status: "completed", startDate: "2021-01-01", endDate: "2023-12-31", fundingETB: 680000, fundingSource: "Ethiopian Energy Authority", tags: ["wind energy", "renewable", "GIS"], summary: "High-resolution wind resource assessment using meteorological stations, satellite data and computational fluid dynamics modelling.", publications: 6, teamSize: 8, centerOfExcellence: "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)", createdAt: new Date().toISOString() },
  { _id: "rp_7", title: "Machine Learning for Amharic Natural Language Processing", lead: "Dr. Hana Tesfaye", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "active", startDate: "2023-09-01", endDate: "2025-08-31", fundingETB: 720000, fundingSource: "Google Research Africa", tags: ["NLP", "Amharic", "machine learning"], summary: "Building an open-source Amharic NLP toolkit covering sentiment analysis, named entity recognition and machine translation.", publications: 4, teamSize: 6, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)", createdAt: new Date().toISOString() },
  { _id: "rp_8", title: "Geothermal Energy Exploration in Aluto-Langano", lead: "Prof. Getachew Mengistu", college: "College of Applied Natural Science", department: "Earth Sciences", status: "active", startDate: "2023-04-01", endDate: "2027-03-31", fundingETB: 3200000, fundingSource: "Icelandic International Development Agency (ICEIDA)", tags: ["geothermal", "energy", "geology"], summary: "Subsurface characterisation and resource estimation of the Aluto-Langano geothermal field using seismic, gravity and MT surveys.", publications: 3, teamSize: 14, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)", createdAt: new Date().toISOString() },
  { _id: "rp_9", title: "Smart Traffic Management System for Adama City", lead: "Dr. Robel Tadesse", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", status: "planned", startDate: "2024-07-01", endDate: "2026-06-30", fundingETB: 890000, fundingSource: "Adama City Administration", tags: ["IoT", "traffic", "smart city"], summary: "IoT sensor network and adaptive signal control algorithm to reduce congestion and vehicle emissions in Adama's central districts.", publications: 0, teamSize: 8, centerOfExcellence: "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)", createdAt: new Date().toISOString() },
  { _id: "rp_10", title: "Traditional Medicinal Plants of Oromia: Pharmacological Study", lead: "Dr. Chaltu Wakjira", college: "College of Applied Natural Science", department: "Biology & Biotechnology", status: "active", startDate: "2022-11-01", endDate: "2025-10-31", fundingETB: 560000, fundingSource: "Ethiopian Public Health Institute", tags: ["ethnobotany", "pharmacology", "traditional medicine"], summary: "Systematic screening of 45 Oromo traditional medicinal plants for antimicrobial, anti-inflammatory and antidiabetic properties.", publications: 7, teamSize: 5, centerOfExcellence: "None", createdAt: new Date().toISOString() },
  { _id: "rp_11", title: "Drought Prediction Model Using Satellite Remote Sensing", lead: "Dr. Fikirte Haile", college: "College of Applied Natural Science", department: "Environmental Science", status: "active", startDate: "2023-01-01", endDate: "2025-12-31", fundingETB: 980000, fundingSource: "NASA / USAID", tags: ["remote sensing", "drought", "climate"], summary: "Random forest model integrating MODIS NDVI, CHIRPS rainfall and GRACE groundwater anomaly data to predict drought onset 3 months ahead.", publications: 4, teamSize: 7, centerOfExcellence: "None", createdAt: new Date().toISOString() },
  { _id: "rp_12", title: "Biogas Production from Coffee Processing Waste", lead: "Prof. Dawit Asfaw", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", status: "completed", startDate: "2020-06-01", endDate: "2023-05-31", fundingETB: 430000, fundingSource: "Ethiopian Coffee & Tea Authority", tags: ["biogas", "coffee", "waste management"], summary: "Anaerobic digestion optimisation of coffee pulp and wastewater to produce biogas for rural household energy, with field pilots in Jimma.", publications: 9, teamSize: 6, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)", createdAt: new Date().toISOString() },
  
  // Proposals
  { _id: "rp_13", title: "High-Temperature Superconductivity in Nanostructured Fe-Based Alloys", lead: "Dr. Solomon Bekele", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", status: "under_review", startDate: "2026-09-01", endDate: "2028-08-31", fundingETB: 1450000, fundingSource: "ASTU Internal", tags: ["superconductivity", "nanotechnology", "alloys"], summary: "Investigating structural alloys under extreme thermal stresses to measure transition temperatures.", publications: 0, teamSize: 4, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)", createdAt: new Date().toISOString() },
  { _id: "rp_14", title: "Automated Micro-Grid Energy Balancing System for Off-Grid Campus", lead: "Dr. Robel Tadesse", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", status: "under_review", startDate: "2026-10-15", endDate: "2028-10-14", fundingETB: 1850000, fundingSource: "Ministry of Innovation and Technology", tags: ["microgrid", "solar", "energy efficiency"], summary: "Designing control algorithms for solar hybrid microgrids on campus.", publications: 0, teamSize: 5, centerOfExcellence: "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)", createdAt: new Date().toISOString() },
  { _id: "rp_15", title: "Amharic Speech-to-Text Recognition System using Transformers", lead: "Dr. Hana Tesfaye", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "under_review", startDate: "2026-11-01", endDate: "2027-10-31", fundingETB: 920000, fundingSource: "Google Research Africa", tags: ["NLP", "speech recognition", "transformers"], summary: "Developing open source automatic speech recognition tools for low-resource Amharic dialects.", publications: 0, teamSize: 3, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)", createdAt: new Date().toISOString() }
];

const DEFAULT_COMMUNITY_PROJECTS: CommunityProject[] = [
  { _id: "cp_1", title: "Free Coding Bootcamp for Adama Youth", lead: "Dr. Robel Tadesse", college: "College of Electrical Engineering & Computing", status: "active", startDate: "2024-01-15", endDate: "2024-12-31", budgetETB: 180000, location: "Adama City", beneficiaries: 320, volunteers: 45, tags: ["coding", "youth", "education", "outreach"], summary: "12-week intensive programming bootcamp for unemployed youth aged 18-30 in Adama, covering Python, web development and mobile apps.", impact: "320 youth trained, 85 placed in tech jobs", createdAt: new Date().toISOString() },
  { _id: "cp_2", title: "Clean Water Access for Wolenchiti Kebele", lead: "Prof. Almaz Tadesse", college: "College of Mechanical, Chemical & Materials Engineering", status: "active", startDate: "2023-06-01", endDate: "2025-05-31", budgetETB: 450000, location: "Wolenchiti, East Shewa", beneficiaries: 2400, volunteers: 30, tags: ["water", "sanitation", "rural", "health"], summary: "Installation of solar-powered water pumping system and distribution network serving 2,400 residents of Wolenchiti kebele.", impact: "2,400 people gained access to clean water", createdAt: new Date().toISOString() },
  { _id: "cp_3", title: "Women Entrepreneurship & Financial Literacy Programme", lead: "Dr. Selamawit Girma", college: "College of Humanities and Social Science", status: "active", startDate: "2023-09-01", endDate: "2025-08-31", budgetETB: 220000, location: "Adama & Modjo", beneficiaries: 580, volunteers: 22, tags: ["women", "entrepreneurship", "financial literacy", "empowerment"], summary: "Business skills training, micro-loan facilitation and mentorship for women-owned small enterprises in Adama and Modjo towns.", impact: "580 women trained, 210 businesses launched", createdAt: new Date().toISOString() },
  { _id: "cp_4", title: "ASTU Blood Donation Campaign", lead: "Dr. Chaltu Wakjira", college: "College of Applied Natural Science", status: "active", startDate: "2024-02-01", endDate: "2024-12-31", budgetETB: 45000, location: "Adama, Multiple Sites", beneficiaries: 9000, volunteers: 120, tags: ["health", "blood donation", "campus", "community"], summary: "Bi-monthly blood donation drives across ASTU campus and partner high schools, supplying Adama General Hospital and nearby health centres.", impact: "1,800 units donated, supplying 3 hospitals", createdAt: new Date().toISOString() },
  { _id: "cp_5", title: "Tree Planting & Green Adama Initiative", lead: "Dr. Fikirte Haile", college: "College of Applied Natural Science", status: "active", startDate: "2023-07-15", endDate: "2026-07-14", budgetETB: 130000, location: "Adama City Green Belt", beneficiaries: 50000, volunteers: 850, tags: ["environment", "tree planting", "climate", "urban greening"], summary: "Mass tree planting campaign targeting 100,000 indigenous tree seedlings along Adama city roads, schools and degraded hillsides.", impact: "62,000 trees planted across 14 sites", createdAt: new Date().toISOString() },
  { _id: "cp_6", title: "Digital Literacy for Secondary School Teachers", lead: "Dr. Hana Tesfaye", college: "College of Electrical Engineering & Computing", status: "completed", startDate: "2023-01-01", endDate: "2023-12-31", budgetETB: 95000, location: "East Shewa Zone", beneficiaries: 480, volunteers: 35, tags: ["digital literacy", "teachers", "education", "ICT"], summary: "Intensive 3-week ICT training for 480 secondary school teachers covering office software, internet research and basic data management.", impact: "480 teachers certified, 24 schools equipped", createdAt: new Date().toISOString() },
  { _id: "cp_7", title: "Mental Health Awareness on ASTU Campus", lead: "Dr. Mekdes Bekele", college: "College of Applied Natural Science", status: "active", startDate: "2024-03-01", endDate: "2024-12-31", budgetETB: 38000, location: "ASTU Campus", beneficiaries: 6500, volunteers: 60, tags: ["mental health", "students", "wellbeing", "campus"], summary: "Peer counselling network, monthly awareness seminars and anonymous helpline supporting student mental health across all departments.", impact: "6,500 students reached, 340 counselling sessions", createdAt: new Date().toISOString() },
  { _id: "cp_8", title: "Micro-Enterprise Support for Adama Street Vendors", lead: "Prof. Tesfaye Demissie", college: "College of Humanities and Social Science", status: "active", startDate: "2023-10-01", endDate: "2025-09-30", budgetETB: 175000, location: "Adama City Markets", beneficiaries: 760, volunteers: 28, tags: ["micro-enterprise", "poverty reduction", "market", "livelihoods"], summary: "Business registration support, bookkeeping training and group savings scheme for informal street vendors in Adama city centre.", impact: "760 vendors formalised, average income up 34%", createdAt: new Date().toISOString() },
];

// Initialize DB with seed arrays in-memory
DB_STORE.users = [...DEFAULT_USERS_SEED];
DB_STORE.researchProjects = [...DEFAULT_RESEARCH_PROJECTS];
DB_STORE.communityProjects = [...DEFAULT_COMMUNITY_PROJECTS];
DB_STORE.colleges = [...DEFAULT_COLLEGES_SEED];
DB_STORE.researchers = [...DEFAULT_RESEARCHERS_SEED];

// Attempt MongoDB Connection safely
let mongooseConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGODB_URI) {
  mongoose.set("bufferCommands", false);
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log("Connected to MongoDB via URI successfully!");
      mongooseConnected = true;
    })
    .catch((err) => {
      console.warn("MongoDB connection failed, operating strictly in memory. Detail:", err.message);
    });
} else {
  console.log("No MONGO_URI supplied. Operating strictly in memory.");
}

// Instantiate Gemini client utility securely (no client exposure)
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err: any) {
    console.error("Gemini API Client initialization failed:", err.message);
  }
}

// Define Mongoose Schema models (only if connected)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "researcher", "viewer"], default: "viewer" },
  college: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const ResearchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  lead: { type: String, required: true },
  college: { type: String, required: true },
  department: { type: String, default: "" },
  status: { type: String, enum: ["active", "paused", "completed", "planned", "under_review", "rejected"], default: "active" },
  startDate: { type: String, required: true },
  endDate: { type: String, default: "" },
  fundingETB: { type: Number, default: 0 },
  fundingSource: { type: String, default: "ASTU Internal" },
  tags: [String],
  summary: { type: String, default: "" },
  publications: { type: Number, default: 0 },
  teamSize: { type: Number, default: 1 },
  centerOfExcellence: { type: String, default: "None" },
  ownerId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const CommunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  lead: { type: String, required: true },
  college: { type: String, required: true },
  status: { type: String, enum: ["active", "paused", "completed", "planned"], default: "active" },
  startDate: { type: String, required: true },
  endDate: { type: String, default: "" },
  budgetETB: { type: Number, default: 0 },
  location: { type: String, default: "Adama" },
  beneficiaries: { type: Number, default: 0 },
  volunteers: { type: Number, default: 0 },
  tags: [String],
  summary: { type: String, default: "" },
  impact: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const CollegeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, default: "" },
  dean: { type: String, default: "" },
  established: { type: Number },
  departments: [String],
  description: { type: String, default: "" },
  color: { type: String, default: "#3b82f6" },
});

const ResearcherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, default: "Dr." },
  college: { type: String, required: true },
  department: { type: String, default: "" },
  email: { type: String, default: "" },
  specialization: [String],
  publications: { type: Number, default: 0 },
  activeProjects: { type: Number, default: 0 },
});

const MongoUser = (mongoose.models.User || mongoose.model("User", UserSchema)) as any;
const MongoResearch = (mongoose.models.Research || mongoose.model("Research", ResearchSchema)) as any;
const MongoCommunity = (mongoose.models.Community || mongoose.model("Community", CommunitySchema)) as any;
const MongoCollege = (mongoose.models.College || mongoose.model("College", CollegeSchema)) as any;
const MongoResearcher = (mongoose.models.Researcher || mongoose.model("Researcher", ResearcherSchema)) as any;

// JWT Middleware Helpers
const JWT_SECRET = process.env.JWT_SECRET || "astu-jwt-secret-key-2024-very-secure-change-in-production";

const protect = (req: any, res: express.Response, next: express.NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No session token supplied." });
  }
  try {
    const token = auth.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Session token invalid or expired." });
  }
};

const requireRole = (...roles: string[]) => {
  return (req: any, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Action forbidden for this role." });
    }
    next();
  };
};

const app = express();
app.use(express.json());

// Enable full dev CORS preflights
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    database: mongooseConnected ? "MongoDB" : "InMemoryFallback",
    aiEnabled: !!aiClient,
  });
});

// ==========================================
// 1. AUTH SERVICE API ENDPOINTS
// ==========================================

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let user: any = null;
    if (mongooseConnected) {
      user = await MongoUser.findOne({ email });
    } else {
      user = DB_STORE.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Account email not registered." });
    }

    const matches = mongooseConnected
      ? bcrypt.compareSync(password, user.passwordHash)
      : bcrypt.compareSync(password, user.passwordHash);

    if (!matches) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account has been deactivated." });
    }

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role, college } = req.body;
  try {
    if (mongooseConnected) {
      const exists = await MongoUser.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: "Email is already registered." });
      const passwordHash = bcrypt.hashSync(password, 12);
      const user = await MongoUser.create({ name, email, passwordHash, role: role || "viewer", college });
      const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({ success: true, token, user });
    } else {
      const exists = DB_STORE.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) return res.status(400).json({ success: false, message: "Email is already registered." });
      const newUser: User = {
        _id: "u_" + Math.random().toString(36).slice(2, 9),
        name,
        email,
        passwordHash: bcrypt.hashSync(password, 12),
        role: role || "viewer",
        college: college || "",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      DB_STORE.users.push(newUser);
      const token = jwt.sign({ id: newUser._id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({ success: true, token, user: newUser });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", protect, async (req: any, res) => {
  try {
    let user: any = null;
    if (mongooseConnected) {
      user = await MongoUser.findById(req.user.id).select("-passwordHash");
    } else {
      user = DB_STORE.users.find((u) => u._id === req.user.id);
    }
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/profile (Self profile edit)
app.put("/api/auth/profile", protect, async (req: any, res) => {
  const { name, email, password, college } = req.body;
  try {
    if (mongooseConnected) {
      const user = await MongoUser.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found." });
      if (name) user.name = name;
      if (college !== undefined) user.college = college;
      if (password) user.passwordHash = bcrypt.hashSync(password, 12);
      await user.save();
      const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ success: true, token, user });
    } else {
      const userIdx = DB_STORE.users.findIndex((u) => u._id === req.user.id);
      if (userIdx === -1) return res.status(404).json({ success: false, message: "User not found." });
      if (name) DB_STORE.users[userIdx].name = name;
      if (college !== undefined) DB_STORE.users[userIdx].college = college;
      if (password) DB_STORE.users[userIdx].passwordHash = bcrypt.hashSync(password, 12);
      const user = DB_STORE.users[userIdx];
      const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ success: true, token, user });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/users (Admin only)
app.get("/api/auth/users", protect, requireRole("admin"), async (req, res) => {
  try {
    let users: any[] = [];
    if (mongooseConnected) {
      users = await MongoUser.find().select("-passwordHash").sort({ createdAt: -1 });
    } else {
      users = [...DB_STORE.users];
    }
    res.json({ success: true, total: users.length, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/users (Admin create account)
app.post("/api/auth/users", protect, requireRole("admin"), async (req, res) => {
  const { name, email, password, role, college } = req.body;
  try {
    if (mongooseConnected) {
      const exists = await MongoUser.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: "Email is already registered." });
      const user = await MongoUser.create({ name, email, passwordHash: bcrypt.hashSync(password, 12), role, college });
      res.status(201).json({ success: true, message: "User created.", user });
    } else {
      const exists = DB_STORE.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) return res.status(400).json({ success: false, message: "Email already registered." });
      const newUser: User = {
        _id: "u_" + Math.random().toString(36).slice(2, 9),
        name,
        email,
        passwordHash: bcrypt.hashSync(password, 12),
        role,
        college: college || "",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      DB_STORE.users.push(newUser);
      res.status(201).json({ success: true, message: "User created.", user: newUser });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/users/:id (Admin update profile)
app.put("/api/auth/users/:id", protect, requireRole("admin"), async (req, res) => {
  const { name, email, role, college, isActive, password } = req.body;
  try {
    if (mongooseConnected) {
      const user = await MongoUser.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found." });
      if (name) user.name = name;
      if (email) user.email = email;
      if (role) user.role = role;
      if (college !== undefined) user.college = college;
      if (isActive !== undefined) user.isActive = isActive;
      if (password) user.passwordHash = bcrypt.hashSync(password, 12);
      await user.save();
      res.json({ success: true, message: "Profile updated.", user });
    } else {
      const userIdx = DB_STORE.users.findIndex((u) => u._id === req.params.id);
      if (userIdx === -1) return res.status(404).json({ success: false, message: "User not found." });
      if (name) DB_STORE.users[userIdx].name = name;
      if (email) DB_STORE.users[userIdx].email = email;
      if (role) DB_STORE.users[userIdx].role = role;
      if (college !== undefined) DB_STORE.users[userIdx].college = college;
      if (isActive !== undefined) DB_STORE.users[userIdx].isActive = isActive;
      if (password) DB_STORE.users[userIdx].passwordHash = bcrypt.hashSync(password, 12);
      res.json({ success: true, message: "Profile updated.", user: DB_STORE.users[userIdx] });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/users/:id/role (Admin promotion)
app.put("/api/auth/users/:id/role", protect, requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  try {
    if (mongooseConnected) {
      const user = await MongoUser.findByIdAndUpdate(req.params.id, { role }, { new: true });
      res.json({ success: true, message: `Role changed to ${role}`, user });
    } else {
      const userIdx = DB_STORE.users.findIndex((u) => u._id === req.params.id);
      if (userIdx === -1) return res.status(404).json({ success: false, message: "User not found." });
      DB_STORE.users[userIdx].role = role;
      res.json({ success: true, message: `Role changed to ${role}`, user: DB_STORE.users[userIdx] });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/seed
app.post("/api/auth/seed", async (req, res) => {
  try {
    if (mongooseConnected) {
      await MongoUser.deleteMany({
        email: { $in: ["admin@astu.edu.et", "researcher@astu.edu.et", "viewer@astu.edu.et"] },
      });
      await MongoUser.insertMany(
        DEFAULT_USERS_SEED.map((u) => ({
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          college: u.college,
          isActive: u.isActive,
        }))
      );
    } else {
      DB_STORE.users = DB_STORE.users.filter(
        (u) => !["admin@astu.edu.et", "researcher@astu.edu.et", "viewer@astu.edu.et"].includes(u.email)
      );
      DB_STORE.users.push(...DEFAULT_USERS_SEED);
    }
    res.json({ success: true, message: "Default users seeded successfully with ASTU colleges." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. RESEARCH SERVICE API ENDPOINTS
// ==========================================

// GET /api/projects
app.get("/api/projects", protect, async (req, res) => {
  const { status, college, search } = req.query;
  try {
    let projects: ResearchProject[] = [];
    if (mongooseConnected) {
      const query: any = {};
      if (status) query.status = status;
      if (college) query.college = new RegExp(college as string, "i");
      if (search) {
        query.$or = [
          { title: new RegExp(search as string, "i") },
          { lead: new RegExp(search as string, "i") },
          { tags: new RegExp(search as string, "i") },
        ];
      }
      const mongoProjs = await MongoResearch.find(query).sort({ createdAt: -1 });
      projects = mongoProjs.map((p) => p.toObject() as any);
    } else {
      projects = DB_STORE.researchProjects.filter((p) => {
        if (status && p.status !== status) return false;
        if (college && !p.college.toLowerCase().includes((college as string).toLowerCase())) return false;
        if (search) {
          const s = (search as string).toLowerCase();
          return (
            p.title.toLowerCase().includes(s) ||
            p.lead.toLowerCase().includes(s) ||
            p.tags.some((t) => t.toLowerCase().includes(s))
          );
        }
        return true;
      });
    }
    res.json({ success: true, total: projects.length, page: 1, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id
app.get("/api/projects/:id", protect, async (req, res) => {
  try {
    let project: any = null;
    if (mongooseConnected) {
      project = await MongoResearch.findById(req.params.id);
    } else {
      project = DB_STORE.researchProjects.find((p) => p._id === req.params.id);
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects
app.post("/api/projects", protect, requireRole("admin", "researcher"), async (req: any, res) => {
  try {
    const data = { ...req.body };
    if (!data.lead) data.lead = req.user.name;
    data.ownerId = req.user.id;

    if (mongooseConnected) {
      const project = await MongoResearch.create(data);
      res.status(201).json({ success: true, project });
    } else {
      const project: ResearchProject = {
        _id: "rp_" + Math.random().toString(36).slice(2, 9),
        title: data.title,
        lead: data.lead,
        college: data.college,
        department: data.department || "",
        status: data.status || "active",
        startDate: data.startDate || new Date().toISOString().split("T")[0],
        endDate: data.endDate || "",
        fundingETB: Number(data.fundingETB) || 0,
        fundingSource: data.fundingSource || "ASTU Internal",
        tags: data.tags || [],
        summary: data.summary || "",
        publications: Number(data.publications) || 0,
        teamSize: Number(data.teamSize) || 1,
        centerOfExcellence: data.centerOfExcellence || "None",
        ownerId: data.ownerId,
        createdAt: new Date().toISOString(),
      };
      DB_STORE.researchProjects.unshift(project);
      res.status(201).json({ success: true, project });
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:id
app.put("/api/projects/:id", protect, requireRole("admin", "researcher"), async (req: any, res) => {
  try {
    if (mongooseConnected) {
      const updated = await MongoResearch.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, project: updated });
    } else {
      const idx = DB_STORE.researchProjects.findIndex((p) => p._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: "Project not found." });
      DB_STORE.researchProjects[idx] = {
        ...DB_STORE.researchProjects[idx],
        ...req.body,
        fundingETB: req.body.fundingETB !== undefined ? Number(req.body.fundingETB) : DB_STORE.researchProjects[idx].fundingETB,
      };
      res.json({ success: true, project: DB_STORE.researchProjects[idx] });
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id
app.delete("/api/projects/:id", protect, requireRole("admin"), async (req, res) => {
  try {
    if (mongooseConnected) {
      await MongoResearch.findByIdAndDelete(req.params.id);
    } else {
      DB_STORE.researchProjects = DB_STORE.researchProjects.filter((p) => p._id !== req.params.id);
    }
    res.json({ success: true, message: "Project deleted." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/seed
app.post("/api/projects/seed", protect, async (req, res) => {
  try {
    if (mongooseConnected) {
      await MongoResearch.deleteMany({});
      await MongoResearch.insertMany(DEFAULT_RESEARCH_PROJECTS);
    } else {
      DB_STORE.researchProjects = [...DEFAULT_RESEARCH_PROJECTS];
    }
    res.json({ success: true, message: "Research projects and proposal mockups seeded successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. COMMUNITY SERVICE API ENDPOINTS
// ==========================================

// GET /api/community-projects
app.get("/api/community-projects", protect, async (req, res) => {
  const { status, college, search } = req.query;
  try {
    let projects: CommunityProject[] = [];
    if (mongooseConnected) {
      const query: any = {};
      if (status) query.status = status;
      if (college) query.college = new RegExp(college as string, "i");
      if (search) {
        query.$or = [
          { title: new RegExp(search as string, "i") },
          { lead: new RegExp(search as string, "i") },
          { location: new RegExp(search as string, "i") },
        ];
      }
      const mongoCp = await MongoCommunity.find(query).sort({ createdAt: -1 });
      projects = mongoCp.map((p) => p.toObject() as any);
    } else {
      projects = DB_STORE.communityProjects.filter((p) => {
        if (status && p.status !== status) return false;
        if (college && !p.college.toLowerCase().includes((college as string).toLowerCase())) return false;
        if (search) {
          const s = (search as string).toLowerCase();
          return (
            p.title.toLowerCase().includes(s) ||
            p.lead.toLowerCase().includes(s) ||
            p.location.toLowerCase().includes(s)
          );
        }
        return true;
      });
    }
    res.json({ success: true, total: projects.length, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/community-projects/:id
app.get("/api/community-projects/:id", protect, async (req, res) => {
  try {
    let project: any = null;
    if (mongooseConnected) {
      project = await MongoCommunity.findById(req.params.id);
    } else {
      project = DB_STORE.communityProjects.find((p) => p._id === req.params.id);
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/community-projects
app.post("/api/community-projects", protect, requireRole("admin", "researcher"), async (req, res) => {
  try {
    const data = { ...req.body };
    if (mongooseConnected) {
      const project = await MongoCommunity.create(data);
      res.status(201).json({ success: true, project });
    } else {
      const project: CommunityProject = {
        _id: "cp_" + Math.random().toString(36).slice(2, 9),
        title: data.title,
        lead: data.lead,
        college: data.college,
        status: data.status || "active",
        startDate: data.startDate || new Date().toISOString().split("T")[0],
        endDate: data.endDate || "",
        budgetETB: Number(data.budgetETB) || 0,
        location: data.location || "Adama",
        beneficiaries: Number(data.beneficiaries) || 0,
        volunteers: Number(data.volunteers) || 0,
        tags: data.tags || [],
        summary: data.summary || "",
        impact: data.impact || "",
        createdAt: new Date().toISOString(),
      };
      DB_STORE.communityProjects.unshift(project);
      res.status(201).json({ success: true, project });
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/community-projects/:id
app.put("/api/community-projects/:id", protect, requireRole("admin", "researcher"), async (req, res) => {
  try {
    if (mongooseConnected) {
      const updated = await MongoCommunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, project: updated });
    } else {
      const idx = DB_STORE.communityProjects.findIndex((p) => p._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: "Project not found." });
      DB_STORE.communityProjects[idx] = {
        ...DB_STORE.communityProjects[idx],
        ...req.body,
        budgetETB: req.body.budgetETB !== undefined ? Number(req.body.budgetETB) : DB_STORE.communityProjects[idx].budgetETB,
      };
      res.json({ success: true, project: DB_STORE.communityProjects[idx] });
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/community-projects/:id
app.delete("/api/community-projects/:id", protect, requireRole("admin"), async (req, res) => {
  try {
    if (mongooseConnected) {
      await MongoCommunity.findByIdAndDelete(req.params.id);
    } else {
      DB_STORE.communityProjects = DB_STORE.communityProjects.filter((p) => p._id !== req.params.id);
    }
    res.json({ success: true, message: "Project deleted." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/community-projects/seed
app.post("/api/community-projects/seed", protect, async (req, res) => {
  try {
    if (mongooseConnected) {
      await MongoCommunity.deleteMany({});
      await MongoCommunity.insertMany(DEFAULT_COMMUNITY_PROJECTS);
    } else {
      DB_STORE.communityProjects = [...DEFAULT_COMMUNITY_PROJECTS];
    }
    res.json({ success: true, message: "Community projects seeded successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. COLLEGE SERVICE API ENDPOINTS
// ==========================================

// GET /api/colleges
app.get("/api/colleges", protect, async (req, res) => {
  try {
    let colleges: College[] = [];
    if (mongooseConnected) {
      const mongoColleges = await MongoCollege.find().sort({ name: 1 });
      colleges = mongoColleges.map((c) => c.toObject() as any);
    } else {
      colleges = [...DB_STORE.colleges].sort((a, b) => a.name.localeCompare(b.name));
    }
    res.json({ success: true, total: colleges.length, colleges });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/researchers
app.get("/api/researchers", protect, async (req, res) => {
  const { college, search } = req.query;
  try {
    let researchers: Researcher[] = [];
    if (mongooseConnected) {
      const query: any = {};
      if (college) query.college = new RegExp(college as string, "i");
      if (search) {
        query.$or = [
          { name: new RegExp(search as string, "i") },
          { specialization: new RegExp(search as string, "i") },
        ];
      }
      const mongoResearchers = await MongoResearcher.find(query).sort({ publications: -1 });
      researchers = mongoResearchers.map((r) => r.toObject() as any);
    } else {
      researchers = DB_STORE.researchers.filter((r) => {
        if (college && !r.college.toLowerCase().includes((college as string).toLowerCase())) return false;
        if (search) {
          const s = (search as string).toLowerCase();
          return (
            r.name.toLowerCase().includes(s) ||
            r.specialization.some((sp) => sp.toLowerCase().includes(s))
          );
        }
        return true;
      });
      researchers.sort((a, b) => b.publications - a.publications);
    }
    res.json({ success: true, total: researchers.length, researchers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seed (Colleges & Researchers seed)
app.post("/api/seed", protect, async (req, res) => {
  try {
    if (mongooseConnected) {
      await MongoCollege.deleteMany({});
      await MongoResearcher.deleteMany({});
      await MongoCollege.insertMany(DEFAULT_COLLEGES_SEED);
      await MongoResearcher.insertMany(DEFAULT_RESEARCHERS_SEED);
    } else {
      DB_STORE.colleges = [...DEFAULT_COLLEGES_SEED];
      DB_STORE.researchers = [...DEFAULT_RESEARCHERS_SEED];
    }
    res.json({ success: true, message: "Colleges and researchers seeded with correct ASTU data." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. ANALYTICS SERVICE API ENDPOINTS
// ==========================================

// Shared Aggregator Engine Function (computes from MongoDB or Local storage directly!)
const getAggregatedAnalytics = async () => {
  let researchProjects: ResearchProject[] = [];
  let communityProjects: CommunityProject[] = [];
  let colleges: College[] = [];
  let researchers: Researcher[] = [];

  if (mongooseConnected) {
    const r = await MongoResearch.find();
    const c = await MongoCommunity.find();
    const col = await MongoCollege.find();
    const res = await MongoResearcher.find();
    researchProjects = r.map((p) => p.toObject() as any);
    communityProjects = c.map((p) => p.toObject() as any);
    colleges = col.map((p) => p.toObject() as any);
    researchers = res.map((p) => p.toObject() as any);
  } else {
    researchProjects = [...DB_STORE.researchProjects];
    communityProjects = [...DB_STORE.communityProjects];
    colleges = [...DB_STORE.colleges];
    researchers = [...DB_STORE.researchers];
  }

  const allProjects = [
    ...researchProjects.map((p) => ({ ...p, source: "research" })),
    ...communityProjects.map((p) => ({ ...p, source: "community" })),
  ];

  // Status counts
  const byStatus = allProjects.reduce((acc: any, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  // Projects per college
  const byCollege = allProjects.reduce((acc: any, p) => {
    acc[p.college] = (acc[p.college] || 0) + 1;
    return acc;
  }, {});

  // Total funding
  const totalFunding = allProjects.reduce((sum, p) => sum + ((p as any).fundingETB || (p as any).budgetETB || 0), 0);

  // Beneficiaries & Volunteers (community projects)
  const totalBeneficiaries = communityProjects.reduce((sum, p) => sum + (p.beneficiaries || 0), 0);
  const totalVolunteers = communityProjects.reduce((sum, p) => sum + (p.volunteers || 0), 0);

  // Total publications
  const totalPublications = researchProjects.reduce((sum, p) => sum + (p.publications || 0), 0);

  // Yearly trend from start dates
  const getProjectYear = (p: any) => {
    const raw = p.startDate || p.createdAt;
    if (!raw) return null;
    if (typeof raw === "string" && /^\d{4}/.test(raw)) return Number(raw.slice(0, 4));
    const yr = new Date(raw).getFullYear();
    return Number.isFinite(yr) ? yr : null;
  };

  const yearCounts: any = {};
  const yearlyByType: any = {};
  const fundingByYear: any = {};

  const tallyYear = (p: any, type: string) => {
    const yr = getProjectYear(p);
    if (!yr || yr < 2018) return;
    yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    if (!yearlyByType[yr]) yearlyByType[yr] = { research: 0, community: 0 };
    yearlyByType[yr][type] += 1;
    fundingByYear[yr] = (fundingByYear[yr] || 0) + (p.fundingETB || p.budgetETB || 0);
  };

  researchProjects.forEach((p) => tallyYear(p, "research"));
  communityProjects.forEach((p) => tallyYear(p, "community"));

  const trendYears = Object.keys(yearCounts).map(Number);
  const minTrendYear = trendYears.length ? Math.min(...trendYears) : new Date().getFullYear() - 5;
  const maxTrendYear = Math.max(new Date().getFullYear(), ...(trendYears.length ? trendYears : [minTrendYear]));

  const yearlyTrendSeries = [];
  for (let y = minTrendYear; y <= maxTrendYear; y++) {
    yearlyTrendSeries.push({
      year: String(y),
      total: yearCounts[y] || 0,
      research: yearlyByType[y]?.research || 0,
      community: yearlyByType[y]?.community || 0,
      fundingETB: fundingByYear[y] || 0,
    });
  }

  // Top research departments
  const byDepartment = researchProjects.reduce((acc: any, p) => {
    const dep = p.department || "Unspecified";
    acc[dep] = (acc[dep] || 0) + 1;
    return acc;
  }, {});

  return {
    summary: {
      totalProjects: allProjects.length,
      researchCount: researchProjects.length,
      communityCount: communityProjects.length,
      activeColleges: colleges.length,
      totalFundingETB: totalFunding,
      totalPublications,
      totalBeneficiaries,
      totalVolunteers,
      activeRatePct: allProjects.length > 0 ? Math.round(((byStatus.active || 0) / allProjects.length) * 1000) / 10 : 0,
    },
    byStatus,
    byCollege,
    yearlyTrend: yearCounts,
    yearlyTrendSeries,
    byDepartment,
    researchProjects,
    communityProjects,
    colleges,
    researchers,
    recentProjects: allProjects.slice(0, 10),
  };
};

// GET /api/api/analytics
app.get("/api/api/analytics", protect, async (req, res) => {
  try {
    const analytics = await getAggregatedAnalytics();
    res.json({ success: true, ...analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Failed to compile aggregate statistics.", detail: err.message });
  }
});

// GET /api/api/export (CSV export)
app.get("/api/api/export", protect, async (req, res) => {
  try {
    const { researchProjects, communityProjects } = await getAggregatedAnalytics();
    const all = [
      ...researchProjects.map((p) => ({ ...p, source: "Research" })),
      ...communityProjects.map((p) => ({ ...p, source: "Community", fundingETB: p.budgetETB })),
    ];
    const headers = ["id", "title", "lead", "college", "status", "startDate", "endDate", "fundingETB", "source"];
    const rows = all.map((p) =>
      headers.map((h) => `"${((p as any)[h] || "").toString().replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=ASTU_Projects_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/api/report (PDF generation)
app.get("/api/api/report", protect, async (req, res) => {
  try {
    const data = await getAggregatedAnalytics();
    const { summary, byStatus, byCollege, researchProjects, communityProjects } = data;

    const type = req.query.type || "full";
    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `ASTU_Analytics_Report_${dateStr}.pdf`;
    let reportTitle = "ASTU University Analytics Report";

    if (type === "research") {
      filename = `ASTU_Research_Summary_${dateStr}.pdf`;
      reportTitle = "ASTU Research Activities & Funding Summary";
    } else if (type === "community") {
      filename = `ASTU_Community_Impact_Report_${dateStr}.pdf`;
      reportTitle = "ASTU Community Outreach & Impact Report";
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(reportTitle, { align: "center" });
    doc.fontSize(11).font("Helvetica").fillColor("#555")
      .text(`Adama Science and Technology University`, { align: "center" })
      .text(`Generated: ${new Date().toLocaleDateString("en-ET", { dateStyle: "full" })}`, { align: "center" });
    doc.moveDown(1.5);

    if (type === "research") {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Research Portfolio Summary");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);

      const researchFunding = researchProjects.reduce((sum, p) => sum + (p.fundingETB || 0), 0);
      const researchRows = [
        ["Total Research Projects", researchProjects.length],
        ["Total Research Funding (ETB)", researchFunding.toLocaleString()],
        ["Total Publications", summary.totalPublications],
        ["Average Publications/Project", researchProjects.length > 0 ? (summary.totalPublications / researchProjects.length).toFixed(1) : 0],
      ];
      researchRows.forEach(([label, value]) => {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#333").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
      });
      doc.moveDown(1.5);

      doc.fontSize(14).font("Helvetica-Bold").text("Research Projects List");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      researchProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i + 1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
          .text(`Lead: ${p.lead || "N/A"}  |  College: ${p.college || "N/A"}  |  Status: ${p.status || "N/A"}  |  Funding: ETB ${(p.fundingETB || 0).toLocaleString()}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });
    } else if (type === "community") {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Community Outreach Summary");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);

      const communityBudget = communityProjects.reduce((sum, p) => sum + (p.budgetETB || 0), 0);
      const communityRows = [
        ["Total Outreach Projects", communityProjects.length],
        ["Total Allocated Budget (ETB)", communityBudget.toLocaleString()],
        ["Total Beneficiaries Reached", summary.totalBeneficiaries.toLocaleString()],
        ["Total Student Volunteers Engaged", summary.totalVolunteers.toLocaleString()],
      ];
      communityRows.forEach(([label, value]) => {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#333").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
      });
      doc.moveDown(1.5);

      doc.fontSize(14).font("Helvetica-Bold").text("Outreach Projects List");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      communityProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i + 1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
          .text(`Lead: ${p.lead || "N/A"}  |  Location: ${p.location || "Adama"}  |  Beneficiaries: ${(p.beneficiaries || 0).toLocaleString()}  |  Budget: ETB ${(p.budgetETB || 0).toLocaleString()}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });
    } else {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Executive Summary");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      const summaryRows = [
        ["Total Projects", summary.totalProjects],
        ["Research Projects", summary.researchCount],
        ["Community Projects", summary.communityCount],
        ["Active Colleges", summary.activeColleges],
        ["Total Funding (ETB)", summary.totalFundingETB.toLocaleString()],
        ["Total Publications", summary.totalPublications],
        ["People Benefited", summary.totalBeneficiaries.toLocaleString()],
        ["Volunteers Engaged", summary.totalVolunteers],
      ];
      summaryRows.forEach(([label, value]) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
      });
      doc.moveDown(1);

      doc.fontSize(14).font("Helvetica-Bold").text("Project Status Breakdown");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      Object.entries(byStatus).forEach(([status, count]) => {
        doc.fontSize(11).font("Helvetica").text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count} projects`);
      });
      doc.moveDown(1);

      doc.fontSize(14).font("Helvetica-Bold").text("Projects by College");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      Object.entries(byCollege).sort((a: any, b: any) => b[1] - a[1]).forEach(([college, count]) => {
        doc.fontSize(10).font("Helvetica").text(`${college}: ${count}`);
      });
      doc.moveDown(1);

      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Research Projects");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      researchProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i + 1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
          .text(`Lead: ${p.lead || "N/A"}  |  College: ${p.college || "N/A"}  |  Status: ${p.status || "N/A"}  |  Funding: ETB ${(p.fundingETB || 0).toLocaleString()}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });

      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Community Projects");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      communityProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i + 1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
          .text(`Lead: ${p.lead || "N/A"}  |  Location: ${p.location || "Adama"}  |  Beneficiaries: ${(p.beneficiaries || 0).toLocaleString()}  |  Status: ${p.status || "N/A"}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });
    }

    doc.end();
  } catch (err: any) {
    console.error("PDF generation failed:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "PDF generation failed", detail: err.message });
    }
  }
});

// AI Translation endpoint
app.post("/api/api/ai/translate", protect, async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ success: false, message: "Missing required translate query parameters." });
  }

  const langName = targetLang.toLowerCase() === "amharic" ? "Amharic" : "Afaan Oromoo";
  const cacheKey = `trans_${Buffer.from(text).toString("base64").slice(0, 100)}_${langName}`;

  // 1. Cache hit?
  if (DB_STORE.aiCache.has(cacheKey)) {
    return res.json({ success: true, translatedText: DB_STORE.aiCache.get(cacheKey), source: "cache" });
  }

  // 2. Gemini execution using standard recommended gemini-3.5-flash
  if (aiClient) {
    try {
      const prompt = `Translate the following academic research or community project description from English into the language: "${langName}". 
      Maintain a professional, formal academic tone. Do not add any conversational remarks, introductions, or notes. Output ONLY the translated text.
      
      Text to translate:
      "${text}"`;

      const result = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const translatedText = result.text?.trim() || "";
      if (translatedText) {
        DB_STORE.aiCache.set(cacheKey, translatedText);
        return res.json({ success: true, translatedText, source: "gemini" });
      }
    } catch (err: any) {
      console.warn("Gemini translate failed, falling back to local dictionaries:", err.message);
    }
  }

  // 3. Fallback dictionary (rules-based backup)
  const dict: Record<string, Record<string, string>> = {
    "AI-Powered Crop Disease Detection Using Deep Learning": {
      "Amharic": "በዲፕ ለርኒንግ በመጠቀም በሰው ሰራሽ አስተዋፅኦ የሰብል በሽታዎችን መለየት",
      "Afaan Oromoo": "Iko-sistema deebii AI tiin dhukkuba midhaanii adda baasuu"
    },
    "Solar-Powered Water Purification for Rural Ethiopia": {
      "Amharic": "ለኢትዮጵያ ገጠር አካባቢዎች በፀሐይ ኃይል የሚሰራ የውሃ ማጣሪያ",
      "Afaan Oromoo": "Humna aduutiin bishaan qulqulleessuu baadiyyaa Itoophiyaatiif"
    },
    "Seismic Risk Assessment of Adama Urban Infrastructure": {
      "Amharic": "የአዳማ ከተማ መሠረተ ልማት የመሬት መንቀጥቀጥ ስጋት ግምገማ",
      "Afaan Oromoo": "Giddugala misooma magaalaa Adaamaa irratti sodaa kirkira lafaa madaaluu"
    }
  };

  const cleanText = text.trim();
  const matched = dict[cleanText]?.[langName];
  if (matched) {
    return res.json({ success: true, translatedText: matched, source: "offline_fallback" });
  }

  const fallbackText = langName === "Amharic" 
    ? `[የአማርኛ ትርጉም]: ${cleanText.slice(0, 80)}...`
    : `[Hiika Afaan Oromoo]: ${cleanText.slice(0, 80)}...`;

  res.json({ success: true, translatedText: fallbackText, source: "offline_fallback" });
});

// AI Chatcopilot assistant
app.post("/api/api/ai/chat", protect, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, message: "Missing chat query prompt." });

  const cleanMsg = message.toLowerCase().trim();
  const cacheKey = `chat_${Buffer.from(cleanMsg).toString("base64").slice(0, 100)}`;

  if (DB_STORE.aiCache.has(cacheKey)) {
    return res.json({ success: true, reply: DB_STORE.aiCache.get(cacheKey), source: "cache" });
  }

  const aggregatedData = await getAggregatedAnalytics();

  if (aiClient) {
    try {
      const projectsSummary = aggregatedData.recentProjects.map((p) => ({
        title: p.title,
        lead: p.lead,
        college: p.college,
        status: p.status,
        funding: (p as any).fundingETB || (p as any).budgetETB || 0,
        source: p.source,
      }));

      const prompt = `You are the ASTU Research & Community AI Copilot, a helpful academic assistant at Adama Science and Technology University.
      Below is the current system telemetry and statistics:
      - Total Projects: ${aggregatedData.summary.totalProjects}
      - Research Projects: ${aggregatedData.summary.researchCount}
      - Community Outreach Projects: ${aggregatedData.summary.communityCount}
      - Active Colleges: ${aggregatedData.summary.activeColleges}
      - Total Funding: ${aggregatedData.summary.totalFundingETB} ETB
      - Total Publications: ${aggregatedData.summary.totalPublications}
      
      Recent key projects:
      ${JSON.stringify(projectsSummary, null, 2)}
      
      Answer the following question about ASTU's research and community outreach using the context above.
      Be professional, friendly, and concise. If the user asks for a proposal draft, feel free to generate a creative summary based on ASTU's focus areas (Computing, Agriculture, Solar, Infrastructure).
      
      User Question: "${message}"`;

      const result = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const reply = result.text?.trim() || "";
      if (reply) {
        DB_STORE.aiCache.set(cacheKey, reply);
        return res.json({ success: true, reply, source: "gemini" });
      }
    } catch (err: any) {
      console.warn("Gemini chatbot error, serving offline matcher:", err.message);
    }
  }

  // Local Keyword-based chatbot fallback
  let reply = "🤖 **ASTU AI Copilot (Offline Mode)**:\nI received your query. To protect your API limits, I am currently running offline. Try asking about **Solar**, **AI**, **Funding**, or **Researchers**.";
  if (cleanMsg.includes("solar") || cleanMsg.includes("water") || cleanMsg.includes("purification")) {
    reply = `☀️ **Solar Research in ASTU**:\n- Lead solar project: **"Solar-Powered Water Purification"** by **Prof. Almaz Tadesse** (CMCME).\n- Budget: **1,200,000 ETB** funded by World Bank / MoSHE.\n- Covers water treatment in Afar and SNNP regions.`;
  } else if (cleanMsg.includes("ai") || cleanMsg.includes("deep learning") || cleanMsg.includes("machine learning")) {
    reply = `🤖 **Artificial Intelligence in ASTU**:\n- **Crop Disease Detection**: Led by **Dr. Tesfaye Worku** (850,000 ETB).\n- **Amharic NLP**: Led by **Dr. Hana Tesfaye** (720,000 ETB, Google Research Africa).`;
  } else if (cleanMsg.includes("funding") || cleanMsg.includes("budget") || cleanMsg.includes("etb")) {
    reply = `💰 **Funding & Grants**:\n- Total active funding portfolio: **${aggregatedData.summary.totalFundingETB.toLocaleString()} ETB**.\n- Largest funded research is **"Geothermal Energy Exploration"** with **3,200,000 ETB**.`;
  } else if (cleanMsg.includes("researcher") || cleanMsg.includes("faculty")) {
    reply = `👨‍🔬 **ASTU Researchers**:\n- Tracking **14 faculty researchers** across all colleges.\n- Top publishers include **Prof. Dawit Asfaw** (27 pubs) and **Prof. Mekdes Bekele** (41 pubs).`;
  }

  res.json({ success: true, reply, source: "offline_fallback" });
});

// GET /api/api/ai/match (Matchmaking AI)
app.get("/api/api/ai/match", protect, async (req, res) => {
  const { projectId, source } = req.query;
  if (!projectId || !source) {
    return res.status(400).json({ success: false, message: "Missing matchmaking params." });
  }

  try {
    const aggregatedData = await getAggregatedAnalytics();
    const allProjects = [
      ...aggregatedData.researchProjects.map((p) => ({ ...p, type: "research" })),
      ...aggregatedData.communityProjects.map((p) => ({ ...p, type: "community" })),
    ];

    const currentProject = allProjects.find((p) => p._id === projectId);
    if (!currentProject) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Similarity scorer logic
    const matches: any[] = [];
    const currentTags = currentProject.tags || [];
    const currentTitleWords = currentProject.title.toLowerCase().split(/\s+/);

    for (const p of allProjects) {
      if (p._id === projectId) continue;

      let score = 0;
      const reasons: string[] = [];

      const pTags = p.tags || [];
      const sharedTags = currentTags.filter((t) => pTags.includes(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 25;
        reasons.push(`Shared research focus: ${sharedTags.join(", ")}`);
      }

      if (p.college === currentProject.college) {
        score += 15;
        reasons.push(`Same College: ${p.college.replace("College of ", "")}`);
      }

      const pTitleWords = p.title.toLowerCase().split(/\s+/);
      const sharedWords = currentTitleWords.filter((w) => w.length > 3 && pTitleWords.includes(w));
      if (sharedWords.length > 0) {
        score += sharedWords.length * 10;
        reasons.push(`Overlapping keywords: ${sharedWords.slice(0, 3).join(", ")}`);
      }

      if (score > 0) {
        matches.push({
          projectId: p._id,
          title: p.title,
          lead: p.lead || "ASTU Faculty",
          college: p.college,
          score: Math.min(score, 100),
          reasons,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    res.json({ success: true, matchResults: matches.slice(0, 3), source: "local_algo" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// VITE AND STATIC ASSETS CLIENT DELIVERY
// ==========================================

const PORT = 3000;
const startServer = async () => {
  // Serve API or client files based on environment
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist"))) {
    // Production serving static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Dev Vite middleware Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ASTU Analytics Unified Server listening on http://0.0.0.0:${PORT}`);
  });
};

startServer();

export default app;
