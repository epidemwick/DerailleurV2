/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSystemData } from '../types/terminal';

export const INITIAL_FILESYSTEM: FileSystemData = {
  "~": {
    folders: ["about", "resume", "projects", "contact"],
    files: {}
  },
  "~/about": {
    folders: [],
    files: {
      "about_me.txt": 
`<div class="ascii-banner"> █████╗ ██████╗  ██████╗██╗  ██╗██╗████████╗███████╗ ██████╗████████╗
██╔══██╗██╔══██╗██╔════╝██║  ██║██║╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝
███████║██████╔╝██║     ███████║██║   ██║   █████╗  ██║        ██║   
██╔══██║██╔══██╗██║     ██╔══██║██║   ██║   ██╔══╝  ██║        ██║   
██║  ██║██║  ██║╚██████╗██║  ██║██║   ██║   ███████╗╚██████╗   ██║   
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝ ╚═════╝   ╚═╝</div>
================================================================
2d Lt Christian James Chadwick // Cyberspace Operations & Analytics
================================================================

PROFESSIONAL SUMMARY:
Commissioned Warfighter Communications Operations Officer (17DX) in
the USAF Air National Guard (108th Wing Communications Squadron) and
Supply/Demand Analyst (GS-12) with the Defense Logistics Agency (DLA).
Holds active Top Secret / SCI clearance.

Over a decade of dual civilian and military experience spanning:
• Cyberspace infrastructure, tactical network defense, and PACE comms
• Advanced supply-chain analytics, automated cloud ETL, and data modeling
• Counter-UAS (C-UAS), passive RF sensor systems, and flight operations
• Aircraft structural mechanics (F-16 fabrication) and QA inspection

OFF-DUTY INTERESTS & PASSIONS:
• Athletics    : Strength training & powerlifting, basketball, trail running
• Outdoors     : Mountain biking, backcountry hiking, camping, wilderness exploration
• Tech & Games : Data science, systems architecture, Valve games & engine tech
• Fuel         : Quality coffee & espresso, craft beer, highland scotch, fine tequila

Navigation: Type 'cd ~/resume && ls' or click the top directory tree.`
    }
  },
  "~/resume": {
    folders: [],
    files: {
      "experience.txt": 
`<div class="ascii-banner">███████╗██╗  ██╗██████╗ ███████╗██████╗ ██╗███████╗███╗   ██╗ ██████╗███████╗
██╔════╝╚██╗██╔╝██╔══██╗██╔════╝██╔══██╗██║██╔════╝████╗  ██║██╔════╝██╔════╝
█████╗   ╚███╔╝ ██████╔╝█████╗  ██████╔╝██║█████╗  ██╔██╗ ██║██║     █████╗  
██╔══╝   ██╔██╗ ██╔═══╝ ██╔══╝  ██╔══██╗██║██╔══╝  ██║╚██╗██║██║     ██╔══╝  
███████╗██╔╝ ██╗██║     ███████╗██║  ██║██║███████╗██║ ╚████║╚██████╗███████╗
╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝</div>
================================================================
PROFESSIONAL EXPERIENCE RECORD // 2d Lt CHRISTIAN J. CHADWICK
================================================================

[01/2026 - PRESENT] :: Assistant Director of Operations
108th Wing - Communications Squadron | Wrightstown, NJ
DSG 2d Lt. - Warfighter Communications Operations Officer (17DX)
• Plans, designs, maintains, and operates information networks and cyberspace
  systems essential for warfighting operations across air, space, and cyberspace.
• Facilitates technical and architectural solutions to operational mandates;
  vets solutions and advises commanding leadership on risk mitigation.
• Directs cyberspace reconfiguration and defensive posture in crisis scenarios.
• Engineers Primary, Alternate, Contingency, and Emergency (PACE) plans.
• Restores primary operational systems from degraded states during exercises.

[03/2024 - PRESENT] :: Supply / Demand Analyst (Series 0301, Grade 12)
DoD - Defense Logistics Agency (DLA) | Philadelphia, PA
• Engineered prototype SharePoint Intranet hub site with integrated navigation,
  connecting division communication sites, TeamSites, and ticketing systems.
• Deployed Power BI dashboards on ticketing metadata for decision support.
• Automated legacy reporting workflows through SAS/DS2 cloud scripting.
• Developed custom Qlik dashboards: weighted asset-group index scoring models,
  individual asset tracking, and demand trend forecasts.
• Briefs senior civilian and military leaders on asset fulfillment and back-orders.
• Manages MS Access fiscal funding tools for supply planners and specialists.
• Authors data dictionaries, database schemas, and IT security evaluations.

[05/2015 - 01/2026] :: F-16 Maintainer - Fabrication / Quality Assurance
USAF Air National Guard - 177th Fighter Wing | Egg Harbor Township, NJ
• Dual AFSC Quality Assurance Inspector (July 2024 - Present): Audits maintenance
  records and structural repairs; conducts QVI, SI, and PE safety evaluations;
  tracks discrepancy trends in LEAP and Wing E&I reports.
• Sheet Metal Mechanic (WG-10, Federal Technician/AGR, 2020 - 2022): F-16 structural
  fabrication, welding, heat-treating, precision machining, and damage repair.
• Metals Technology (2A7X1, 2014 - 2020): Machine-shop tooling and metalcraft.

[09/2022 - 03/2024] :: Systems Research Analyst
General Dynamics Information Technology (GDIT) | Egg Harbor Township, NJ
• Coordinated UAS and Counter-UAS (C-UAS) test flights and COA compliance.
• Installed and calibrated passive RF sensor arrays and radar detection systems.
• Built automated ingestion pipelines (cron, SFTP) for JSON, SQLite, and PCAP logs.
• Produced ArcGIS geospatial heatmaps, 3D probability contours, and drone tracks.

[02/2015 - 04/2015] :: IS Customer Support Analyst
Inspiria Health Network | Bridgeton, NJ
• IT incident lifecycle management, hardware/software triage and escalation.`,

      "education.txt": 
`<div class="ascii-banner">███████╗██████╗ ██╗   ██╗ ██████╗ █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
█████╗  ██║  ██║██║   ██║██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║
██╔══╝  ██║  ██║██║   ██║██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
███████╗██████╔╝╚██████╔╝╚██████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
╚══════╝╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝</div>
================================================================
ACADEMIC DEGREES & MILITARY COMMISSIONS
================================================================

• Officer Training School (OTS) (June 14 - August 16)
  USAF Air University | Maxwell AFB, AL
  Commissioned 2d Lt, Warfighter Communications Operations (17DX) | USAF ANG

• Master of Science (P.S.M) in Environmental Science (12/2021)
  Stockton University | Galloway, NJ
  GPA: 3.47 / 4.0 (36 Graduate Credits)

• Associate of Applied Science (A.A.S) in Aircraft Structural Technology (07/2022)
  Community College of the Air Force | Maxwell AFB, AL
  134 Credits Earned

• Bachelor of Science in Environmental Studies (05/2019)
  Rowan University | Glassboro, NJ
  GPA: 3.7 / 4.0 | Honors: Magna Cum Laude
  Minor: Planning - Sustainable Built Environments

• Associate of Science (A.S.) in Computer Information Systems (2014)
  Atlantic Cape Community College | Mays Landing, NJ
  GPA: 3.0 / 4.0`,

      "skills.txt": 
`<div class="ascii-banner">███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
███████║██║  ██╗██║███████╗███████╗███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝</div>
================================================================
CLEARANCE, TECHNICAL & DOMAIN SKILLS
================================================================

SECURITY CLEARANCE:
• Top Secret with SCI Access (TS/SCI)

DEFENSE & CYBERSPACE OPERATIONS:
• Cyberspace Systems & Infrastructure (Air, Space, Cyber domains)
• Defensive Cyberspace Terrain Mapping & PACE Communications Planning
• Counter-UAS (C-UAS) Sensor Operations, Passive RF Detection & Radar Systems
• Aircraft Structural Fabrication & Sheet Metal Mechanics (F-16 Airframes)

DATA, ANALYTICS & PROGRAMMING:
• Languages & Query : SQL, Python, SAS/DS2, Bash, PowerShell
• BI & Visualization: Power BI, Qlik Sense, ArcGIS / Geospatial Mapping
• Databases & Formats: PostgreSQL, SQLite, MS Access, JSON, PCAP, CSV
• Cloud, Edge & DevOps: Cloudflare (Pages, Workers, DNS & Edge Proxy), GitHub (Git VCS, Repos, CI/CD), Google AI Studio & Cloud Run, Linux (Debian/RHEL/Arch), Windows Server, Docker, SFTP/Cron

CERTIFICATIONS:
• DAU Life Cycle Logistics - Foundational
• CompTIA A+ (Legacy / Inactive)`
    }
  },
  "~/projects": {
    folders: [],
    files: {
      "README.txt": 
`<div class="ascii-banner">██████╗ ██████╗  ██████╗      ██╗███████╗ ██████╗████████╗███████╗
██╔══██╗██╔══██╗██╔═══██╗     ██║██╔════╝██╔════╝╚══██╔══╝██╔════╝
██████╔╝██████╔╝██║   ██║     ██║█████╗  ██║        ██║   ███████╗
██╔═══╝ ██╔══██╗██║   ██║██   ██║██╔══╝  ██║        ██║   ╚════██║
██║     ██║  ██║╚██████╔╝╚█████╔╝███████╗╚██████╗   ██║   ███████║
╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚══════╝</div>
================================================================
CHADHAWK CORPS // EXPERIMENTAL PROJECT LABS & CODE REPOSITORIES
================================================================

[ ACTIVE REPOSITORIES & ENGINEERING LABS ]

1. EPIDEMWICK GITHUB PROFILE & REPOSITORIES
   • Profile URL  : <a class="social-link" href="https://github.com/epidemwick" target="_blank" rel="noopener noreferrer">https://github.com/epidemwick</a>
   • Focus Areas  : Cyberspace operations, defense systems, data pipelines & telemetry

2. DERAILLEUR v2 // CYBERDECK PORTFOLIO & REPOSITORIES
   • WebApp Repo  : <a class="social-link" href="https://github.com/epidemwick/DerailleurV2" target="_blank" rel="noopener noreferrer">https://github.com/epidemwick/DerailleurV2</a>
   • Access       : (Private - for now..)
   • Live Domain  : <a class="social-link" href="https://chadhawkcorps.com" target="_blank" rel="noopener noreferrer">https://chadhawkcorps.com</a>
   • Architecture : Full-Stack Retro Cyberdeck & CRT Phosphor Terminal
   • Tech Stack   : React, TypeScript, Express, Tailwind CSS, Web Audio API`
    }
  },
  "~/contact": {
    folders: [],
    files: {
      "contact_me.txt": 
`<div class="ascii-banner"> ██████╗ ██████╗ ███╗   ██╗████████╗ █████╗  ██████╗████████╗
██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔════╝╚══██╔══╝
██║     ██║   ██║██╔██╗ ██║   ██║   ███████║██║        ██║   
██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██║██║        ██║   
╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╗   ██║   
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝</div>
================================================================
DIRECT TRANSMISSION CHANNELS // CHRISTIAN J. CHADWICK
================================================================

PERSONAL & WORK TRANSMISSION CHANNELS:
[ EMAIL: PERS ] epidemwick@chadhawkcorps.com
[ EMAIL: USAF ] christian.chadwick@us.af.mil
[ EMAIL: DLA  ] christian.chadwick@dla.mil
[ EMAIL: ALT  ] chadwick6677@gmail.com

CODE & PROJECT REPOSITORIES:
<a class="social-link" href="https://github.com/epidemwick/DerailleurV2" target="_blank" rel="noopener noreferrer">[ PROJECT REPO ] https://github.com/epidemwick/DerailleurV2</a>
<a class="social-link" href="https://github.com/epidemwick" target="_blank" rel="noopener noreferrer">[ GITHUB USER  ] https://github.com/epidemwick</a>

EXTERNAL FREQUENCIES:
<a class="social-link" href="https://www.instagram.com/christian.j.chadwick/" target="_blank" rel="noopener noreferrer">[ INSTAGRAM ] @christian.j.chadwick</a>
<a class="social-link" href="https://www.facebook.com/christian.j.chadwick" target="_blank" rel="noopener noreferrer">[ FACEBOOK ] Christian J. Chadwick</a>
<a class="social-link" href="https://www.youtube.com/channel/UCtkKmGziodoO6hJ0sYuD0-w" target="_blank" rel="noopener noreferrer">[ YOUTUBE ] Official Channel</a>

----------------------------------------------------------------
LOCATION: Joint Base McGuire-Dix-Lakehurst / Philadelphia / EHT, NJ
SECURITY: TS/SCI Cleared`
    }
  }
};

export const FOLDER_ORDER = ["~", "~/about", "~/resume", "~/projects", "~/contact"];

export function resolveFileName(inputName: string | undefined, files: Record<string, string>): string | null {
  if (!inputName) return null;
  const clean = inputName.trim();
  if (files[clean]) return clean;

  const normalized = clean.toLowerCase().replace(/-/g, '_');
  const withTxt = normalized.endsWith('.txt') ? normalized : `${normalized}.txt`;
  if (files[withTxt]) return withTxt;

  if (clean.toLowerCase().startsWith('about') && files['about_me.txt']) return 'about_me.txt';
  if ((clean.toLowerCase().startsWith('contact') || clean.toLowerCase().startsWith('comm')) && files['contact_me.txt']) return 'contact_me.txt';
  if (clean.toLowerCase().startsWith('readme') && files['README.txt']) return 'README.txt';
  if (clean.toLowerCase().startsWith('exp') && files['experience.txt']) return 'experience.txt';
  if (clean.toLowerCase().startsWith('edu') && files['education.txt']) return 'education.txt';
  if (clean.toLowerCase().startsWith('skill') && files['skills.txt']) return 'skills.txt';

  return null;
}

export function resolveTargetDir(
  currentDir: string,
  targetArg: string | undefined,
  fileSystem: FileSystemData
): { targetDir: string; exists: boolean } {
  const cleanArg = (targetArg || "~").trim().replace(/\/+$/, "");
  
  if (!cleanArg || cleanArg === "~" || cleanArg === "/" || cleanArg === "..") {
    return { targetDir: "~", exists: true };
  }

  const folderKey = cleanArg.startsWith("~/")
    ? cleanArg
    : `~/${cleanArg.replace(/^\.\//, "")}`;

  if (fileSystem[folderKey]) {
    return { targetDir: folderKey, exists: true };
  }

  return { targetDir: cleanArg, exists: false };
}

/**
 * Computes a dynamic interest mode based on temperature and weather description.
 */
export function computeWeatherInterestMode(tempF: number, conditionText: string): string {
  const cond = conditionText.toLowerCase();

  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('thunder')) {
    return "Heavy Lifting & Single-Malt Scotch Mode";
  }
  if (cond.includes('snow') || cond.includes('flurry') || cond.includes('ice') || cond.includes('blizzard')) {
    return "Winter Backcountry & Highland Scotch Mode";
  }

  if (tempF <= 38) {
    return "Hot Espresso & Data Science Mode";
  } else if (tempF <= 52) {
    return "Crisp Trail Running & Heavy Deadlifts Mode";
  } else if (tempF <= 66) {
    return "Mountain Biking & Craft Beer Mode";
  } else if (tempF <= 78) {
    return "Full-Court Basketball & Cold Brew Mode";
  } else if (tempF <= 88) {
    return "Wilderness Camping & Fine Tequila Mode";
  } else {
    return "AC Valve Gaming & Cold IPA Mode";
  }
}
