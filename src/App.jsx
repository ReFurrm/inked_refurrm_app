import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, serverTimestamp, getDocs, updateDoc } from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore';
import { Send, History, Loader, Save, BookOpen, ChevronLeft, Copy, User, X, CheckCircle, Sun, Moon, Feather, Mail, Lightbulb, Sparkles, GraduationCap, Briefcase, BookCopy, Search, ChevronDown, Code, Heart, Wand2, Megaphone, ImageIcon, FileText, AtSign, Scale } from 'lucide-react'; // Added Scale

// Set Firebase log level for debugging
setLogLevel('debug');

// --- Global Variables (Provided by Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The AI Model and API endpoint
const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';
const TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;
// NEW: Image Model and API
const IMAGE_MODEL = 'imagen-4.0-generate-001';
const IMAGE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:predict?key=`;
const API_KEY = ""; // This will be automatically provided by the runtime environment

// --- NEW: Style & Font Injector Component ---
// This component loads all our custom fonts and Tailwind config.
const StyleInjector = () => {
  useEffect(() => {
    // 1. Add Fonts
    const fontLink = document.createElement('link');
    fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Orbitron:wght@700&family=Poppins:wght@500;600;700&display=swap";
    fontLink.rel = "stylesheet";
    
    const fontPreconnect1 = document.createElement('link');
    fontPreconnect1.href = "https://fonts.googleapis.com";
    fontPreconnect1.rel = "preconnect";
    
    const fontPreconnect2 = document.createElement('link');
    fontPreconnect2.href = "https://fonts.gstatic.com";
    fontPreconnect2.rel = "preconnect";
    fontPreconnect2.crossOrigin = "true";

    document.head.appendChild(fontPreconnect1);
    document.head.appendChild(fontPreconnect2);
    document.head.appendChild(fontLink);

    // 2. Add Tailwind script (it might be loaded already, but this ensures it)
    let tailwindScript = document.querySelector('script[src="https://cdn.tailwindcss.com"]');
    if (!tailwindScript) {
        tailwindScript = document.createElement('script');
        tailwindScript.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(tailwindScript);
    }
    
    // 3. Add Tailwind Config script (this will run AFTER tailwind loads)
    tailwindScript.onload = () => {
      // Check if config already exists to avoid duplication
      if (document.getElementById('tailwind-config')) return;
      
      const configScript = document.createElement('script');
      configScript.id = 'tailwind-config';
      configScript.innerHTML = `
        tailwind.config = {
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                'silver-mist': '#C8D1D9', // <-- Reset to original color
                'aqua-pulse': '#00E6CC',
                'deep-teal-byte': '#006C7A',
                'obsidian-black': '#0C0C0C',
                'neural-violet': '#7843FF',
                'cyber-blush': '#E52E71',
              },
              fontFamily: {
                logo: ['Orbitron', 'sans-serif'],
                ui: ['Poppins', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
              },
            },
          },
        };
      `;
      document.head.appendChild(configScript);
    };
    
    // If tailwind is already loaded, run the config injection manually
    if (window.tailwind) {
        tailwindScript.onload();
    }

    // 4. Add base font styles
    if (!document.getElementById('base-font-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'base-font-styles';
        styleTag.innerHTML = `
          body {
            font-family: 'Poppins', sans-serif; /* Default to UI font */
          }
          .font-body {
            font-family: 'Inter', sans-serif;
          }
          .font-logo {
            font-family: 'Orbitron', sans-serif;
          }
        `;
        document.head.appendChild(styleTag);
    }

  }, []); // Empty array ensures this runs only once

  return null; // This component doesn't render anything
};


// --- System Prompts (Personas) ---

const STORY_SYSTEM_PROMPT = `Act as an award-winning literary fiction author with a focus on immersive sensory detail, strong character voice, and a mastery of 'show, don't tell.' Your goal is to write a captivating scene that immediately engages the reader, using sophisticated vocabulary and natural, compelling dialogue. The output must be a single, cohesive narrative of 500-1000 words. Do not include a title or introduction in the final output.`;

const LIFE_LETTER_SYSTEM_PROMPT = `Act as an exceptionally empathetic and articulate ghostwriter. Your user is overwhelmed and trying to write a difficult, personal letter. Your task is to take their raw, fragmented thoughts and transform them into a clear, sincere, and human-sounding letter. You must capture the specified tone perfectly, whether it's an apology, a confession, or setting a boundary. The output should be ready to send, carrying genuine emotion, rhythm, and clarity. Do not sound like an AI. Do not use corporate jargon. Write from the 'I' perspective, as if you are the user.`;

const PROMPT_ARCHITECT_SYSTEM_PROMPT = `Act as a 'Prompt Architect,' an expert in AI prompt engineering. Your job is to take a user's simple idea and transform it into a detailed, structured, and highly effective prompt for a large language model (like GPT-3, GPT-4, or Claude). The prompt you generate should be a complete, ready-to-copy-paste block of text. It must include a clear [Role] for the AI, a specific [Task], detailed [Context], strict [Constraints] or rules, and a clear [Output Format]. Your goal is to maximize the quality, relevance, and precision of the AI's response.`;

const BRAND_VOICE_SYSTEM_PROMPT = `Act as a world-class brand strategist and storyteller. Your user wants to build a brand voice that has 'soul' and avoids 'corporate sludge.' Your task is to take their raw inputs—brand name, product, audience, and values—and generate the requested brand document (Origin Story, About Page, or Mission Statement). The tone must be authentic, human, and resonate with the specified values. Write compelling copy that connects on an emotional level. Do not use buzzwords, jargon, or generic marketing phrases.`;

const HOMEWORK_HELPER_SYSTEM_PROMPT = `Act as a helpful and encouraging tutor. A student has asked for help with a homework question. Your primary goal is to *explain the concept* and *guide them to the answer*, not just provide the final solution. 
If they ask you to 'Solve this problem,' first explain the steps and the underlying concepts, then show how to apply those steps to get the solution.
If they ask you to 'Explain this concept,' use clear, simple language and provide a relatable example.
If they ask you to 'Check my answer,' have them provide their answer and your job is to either confirm it's correct or, if it's incorrect, gently point out where the mistake might be and guide them to the right logic.
Your tone should be patient, positive, and easy to understand.`;

const BUSINESS_ASSISTANT_SYSTEM_PROMPT = `Act as an expert Small Business Consultant. Your user wants to generate a professional document. Your task is to take their selected document type, business name, and key details, and generate a polished, professional, and highly useful output.
- For a 'Business Plan Section' or 'Investor Pitch Slide', write concise, compelling, and data-driven copy.
- For 'Invoice', 'Proposal', or 'Receipt', generate a clearly structured, itemized document. If no format is given, use markdown tables.
- For 'Start-up Cost Planner', create a categorized and itemized list of potential expenses.
- For 'Letterhead', generate the HTML and CSS for a "not just plain jane" (i.e., beautiful and modern) letterhead template using the user's details. Enclose the code in \`\`\`html and \`\`\`css markdown blocks.
Your tone should be professional, knowledgeable, and helpful.`;

const DIGITAL_PRODUCT_SYSTEM_PROMPT = `Act as an expert ghostwriter and instructional designer. The user wants to create a complete digital product from a single topic. Your task is to generate a comprehensive, structured, and ready-to-use piece of long-form content.
- For an 'Ebook', generate a complete table of contents, a compelling introduction, and the full text for Chapter 1.
- For an 'Online Course', generate a complete course outline with modules and lesson titles. Then, write the full video script for the first lesson (Module 1, Lesson 1), including spoken content and suggestions for on-screen visuals.
- For a 'Webinar Script', generate a catchy title, a 3-point agenda, a compelling introduction to hook the audience, and the full spoken script for the first 10 minutes of the webinar.
The output must be detailed, professionally written, and perfectly formatted using Markdown for clear headings, subheadings, and lists.`;

const MARKET_NEEDS_SYSTEM_PROMPT = `Act as a senior market analyst and business strategist. Your task is to uncover unfulfilled market needs based on a user's provided niche and target audience.
Your analysis must be detailed and actionable. Please structure your response using the following Markdown format:
### 1. Top 3 Unfulfilled Market Needs
- **Need 1:** (Describe the specific gap or customer pain point).
  - *Why it's unfulfilled:* (Explain the current market failure).
- **Need 2:** ...
- **Need 3:** ...
### 2. Potential Customer Personas (Pain Points)
- **Persona 1 (e.g., 'The Frustrated Hobbyist'):** (Describe their specific, unresolved problem).
- **Persona 2 (e.g., 'The Overwhelmed Small Business Owner'):** ...
### 3. Actionable Insights & Product Ideas
- **Idea 1:** (Suggest a specific digital product, service, or content idea that directly addresses Need 1).
- **Idea 2:** (Suggest an idea for Need 2).
- **Idea 3:** (Suggest an idea for Need 3).
Your insights must be sharp, analytical, and focused on identifying tangible opportunities.`;

const CODE_SIDEKICK_SYSTEM_PROMPT = `Act as an expert 10x developer and pair-programming partner. Your user needs help with a coding task. Your goal is to provide clean, efficient, and well-commented code to solve their problem.
- ALWAYS wrap your code blocks in Markdown triple backticks (\`\`\`).
- Specify the language (e.g., \`\`\`python, \`\`\`javascript, \`\`\`html).
- If the user asks for a 'snippet' or 'function', provide just that.
- If the user asks for an 'explanation', explain the concept clearly, providing short code examples.
- If the user asks to 'debug', ask for their code, then provide a corrected version with comments explaining the fix.
- Your tone should be knowledgeable, helpful, and concise.`;

const LEGACY_KEEPER_SYSTEM_PROMPT = `Act as a gentle and intuitive editor and memoirist. The user is pasting in a collection of messy, fragmented, and unordered notes, memories, or story drafts. Their goal is simple: to "Put It All Together" and "see what they are working with."
- Your *only* job is to organize this chaos. 
- Read all the fragments, identify a logical or emotional narrative flow, and then stitch them together into a single, coherent document.
- Smooth out the transitions between fragments so it reads cleanly.
- Do NOT add new content, chapters, or sections. Do NOT change the user's voice.
- Your output should be just the compiled, organized, and cleaned-up text, ready for the user to read back.
- Format the output as a clean, flowing narrative. Use paragraphs and line breaks appropriately.`;

const CAPTION_WITCH_SYSTEM_PROMPT = `Act as the 'Caption Witch,' a witty, sharp, and creative social media expert. Your user wants captions with "real personality" and "flavor," not "AI sludge."
- Your task is to take their post topic, target platform, and desired "flavor" (e.g., funny, poetic, spicy) and generate 3-5 distinct caption options.
- The captions should be engaging, human-sounding, and include a clear call-to-action if one makes sense.
- ALWAYS include 3-5 relevant, high-traffic hashtags with each caption.
- The output should be formatted clearly, with each caption option distinct.`;

const AD_COPY_ALCHEMIST_SYSTEM_PROMPT = `Act as the 'Ad Copy Alchemist,' a world-class direct response copywriter. Your user needs high-converting ad copy that sounds human and compelling.
- Your task is to take their product, audience, and key benefit, and transmute them into 3-5 distinct, powerful ad variations for the specified format.
- **For 'Facebook/IG Ad':** Write a short, scroll-stopping hook, a persuasive body, and a clear call-to-action (CTA).
- **For 'Google Ad Headline':** Write 5-7 punchy, keyword-rich headlines (max 30 characters).
- **For 'Google Ad Description':** Write 2-3 benefit-driven descriptions (max 90 characters).
- **For 'Taglines/Hooks':** Write 5-10 catchy, memorable taglines or hooks.
- Focus on benefits over features. Use emotional triggers and clear language. No "AI sludge."`;

const RESUME_REPAIR_SYSTEM_PROMPT = `Act as an expert career coach and professional resume writer. Your goal is to transform the user's raw resume text or work history into a powerful, achievement-oriented document.
- Focus on using strong action verbs (e.g., "Spearheaded," "Optimized," "Generated").
- Quantify results where possible (even if placeholders are needed, like "[X]% increase").
- Tailor the language to the user's specified 'Target Job/Industry'.
- Improve clarity, flow, and professionalism.
- Fix any grammar or awkward phrasing.
- Output the result as clean Markdown, separated by clear section headers (Summary, Experience, Skills, etc.).`;

const EMAIL_SURGEON_SYSTEM_PROMPT = `Act as an expert communications strategist and copy editor. Your user has a "messy" or "draft" email that needs to be fixed.
- Your goal is to rewrite the email to be clear, concise, and effective, while perfectly hitting the desired tone.
- Remove passive voice, hedging, and emotional clutter.
- Ensure the 'Call to Action' or main point is unmistakable.
- If the user is angry (e.g., a complaint), de-escalate the language while keeping the firm boundary.
- If the user is asking for something (e.g., a raise), make the ask confident and justified.
- Provide 2 variations: one "Direct & Concise" and one slightly more "Warm & Contextual".`;

// NEW: System Prompt for "Contract Clarifier"
const CONTRACT_CLARIFIER_SYSTEM_PROMPT = `Act as an expert legal analyst and "plain English" translator. Your user has pasted a dense legal text (like a contract, lease, or terms of service). Your job is to break it down so a normal person can understand it perfectly.
- **Do NOT** just summarize it. You must analyze it for risks and clarity.
- Structure your response using this exact Markdown format:
  ### 1. What This Means For You
  (A simple, jargon-free explanation of the document's main purpose).
  ### 2. Red Flags & "Gotchas" 🚩
  - **Flag 1:** (Identify any clause that puts the user at risk, limits their rights, or is unusual).
  - **Flag 2:** ...
  ### 3. Action Items & Next Steps
  (What should the user do? e.g., "Clarify clause X," "Ask for Y to be removed," "Safe to sign," etc.).
- Disclaimer: Start or end with a brief standard disclaimer that you are an AI and this is not legal advice.`;


// --- Initial States for Forms ---

const initialStoryFormState = {
    premise: '',
    mood: 'Melancholy',
    details: '',
};

const initialLetterFormState = {
    letterType: 'Setting a Boundary',
    recipient: '',
    coreMessage: '',
    tone: 'Firm but kind',
};

const initialPromptArchitectFormState = {
    subject: '',
    goal: '',
    persona: '',
    constraints: '',
};

const initialBrandVoiceFormState = {
    brandName: '',
    productService: '',
    audience: '',
    keyValues: '',
    outputType: 'Mission Statement',
};

const initialHomeworkHelperFormState = {
    subject: '',
    question: '',
    helpType: 'Explain this concept',
};

const initialBusinessAssistantFormState = {
    documentType: 'Business Plan Section',
    businessName: '',
    keyDetails: '',
};

const initialDigitalProductFormState = {
    productType: 'Ebook (Outline + Chapter 1)',
    topic: '',
    audience: '',
    keyTakeaways: '',
};

const initialMarketNeedsFormState = {
    marketNiche: '',
    targetAudience: '',
};

const initialCodeSidekickFormState = {
    language: 'JavaScript',
    goal: '',
    requirements: '',
};

const initialLegacyKeeperFormState = {
    fragments: '',
};

const initialCaptionWitchFormState = {
    platform: 'Instagram',
    topic: '',
    flavor: 'Witty',
};

const initialAdCopyAlchemistFormState = {
    productName: '',
    targetAudience: '',
    keyBenefit: '',
    adType: 'Facebook/IG Ad',
};

const initialAiLogoGeneratorFormState = {
    companyName: '',
    style: 'Minimalist',
    colors: '',
};

const initialResumeRepairFormState = {
    currentResume: '',
    targetJob: '',
    industry: '',
};

const initialEmailSurgeonFormState = {
    draftEmail: '',
    recipient: '',
    goal: '',
    tone: 'Professional',
};

// NEW: Initial state for ContractClarifierForm
const initialContractClarifierFormState = {
    contractType: 'Freelance Agreement',
    contractText: '',
};

// --- Dropdown Options ---

const MOOD_OPTIONS = [
    'Suspenseful', 'Melancholy', 'Witty', 'Nostalgic', 'Intense', 'Whimsical', 'Somber', 'Hopeful'
];

const LETTER_TYPE_OPTIONS = [
    'Setting a Boundary', 'Apology', 'Confession', 'Thank You Note', 'Goodbye Letter', 'Love Letter', 'Request for Help', 'Resignation', 'Breakup'
];

const TONE_OPTIONS = [
    'Firm but kind', 'Deeply regretful', 'Heartfelt and loving', 'Formal and respectful', 'Vulnerable and honest', 'Direct and serious'
];

const BRAND_OUTPUT_TYPE_OPTIONS = [
    'Mission Statement', 'Origin Story', 'About Page'
];

const HELP_TYPE_OPTIONS = [
    'Explain this concept', 'Solve this problem (with steps)', 'Check my answer'
];

const BUSINESS_DOC_TYPE_OPTIONS = [
    'Business Plan Section',
    'Investor Pitch Slide',
    'Start-up Cost Planner',
    'Invoice',
    'Proposal',
    'Receipt',
    'Letterhead (HTML/CSS)'
];

const DIGITAL_PRODUCT_TYPE_OPTIONS = [
    'Ebook (Outline + Chapter 1)',
    'Online Course (Outline + Lesson 1 Script)',
    'Webinar Script (Intro + First 10 Mins)'
];

const LANGUAGE_OPTIONS = [
    'JavaScript', 'Python', 'HTML/CSS', 'React', 'SQL', 'Java', 'C++', 'Go', 'PHP', 'Ruby', 'General'
];

const PLATFORM_OPTIONS = [
    'Instagram', 'Facebook', 'X (Twitter)', 'LinkedIn', 'TikTok'
];

const FLAVOR_OPTIONS = [
    'Witty / Funny', 'Poetic / Deep', 'Spicy / Edgy', 'Vulnerable / Honest', 'Inspiring / Motivational', 'Professional / Polished'
];

const AD_TYPE_OPTIONS = [
    'Facebook/IG Ad',
    'Google Ad Headline',
    'Google Ad Description',
    'Taglines/Hooks'
];

const LOGO_STYLE_OPTIONS = [
    'Minimalist', 'Geometric', 'Vintage', 'Abstract', 'Lettermark', 'Modern', 'Futuristic', 'Playful'
];

const EMAIL_TONE_OPTIONS = [
    'Professional', 'Direct & Urgent', 'Friendly & Warm', 'Apologetic', 'Persuasive', 'Firm Boundary'
];

// NEW: Options for Contract Clarifier
const CONTRACT_TYPE_OPTIONS = [
    'Freelance Agreement', 'Lease/Rental Agreement', 'Terms of Service', 'NDA (Non-Disclosure)', 'Employment Contract', 'General Contract'
];

// --- Subscription Plans Data ---
// ... (Subscription plans are unchanged) ...
const SUBSCRIPTION_PLANS = [
    { 
        id: 'weekly', 
        name: 'Weekly Pass', 
        price: '$4.99', 
        interval: 'wk', 
        tag: 'Quick Access',
        features: ['Unlimited generations', 'Standard tone profiles'], 
        highlight: false 
    },
    { 
        id: 'monthly', 
        name: 'Monthly Pro', 
        price: '$14.99', 
        interval: 'mo', 
        tag: 'Best Value',
        features: ['Unlimited generations', 'Priority AI access', 'Custom tone profiles'], 
        highlight: true 
    },
    { 
        id: 'annual', 
        name: 'Annual Master', 
        price: '$119.99', 
        interval: 'yr', 
        tag: 'Save 30%',
        features: ['Unlimited generations', 'Priority AI access', 'Custom tone profiles', 'Beta feature access'], 
        highlight: false 
    },
];


// --- Utility Functions ---
// ... (copyToClipboard, CustomAlert, PricingModal functions are unchanged) ...
const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    try {
        const success = document.execCommand('copy');
        document.body.removeChild(el);
        return success;
    } catch (err) {
        document.body.removeChild(el);
        console.error('Failed to copy text: ', err);
        return false;
    }
};

const CustomAlert = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-obsidian-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-obsidian-black p-6 rounded-xl shadow-2xl max-w-sm w-full border border-silver-mist/30 transform transition-all">
            <h3 className="font-ui text-xl font-bold text-cyber-blush mb-3">Notice</h3>
            <p className="font-body text-deep-teal-byte/90 dark:text-silver-mist/90 mb-5" dangerouslySetInnerHTML={{ __html: message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            <button
                onClick={onClose}
                className="w-full bg-aqua-pulse text-obsidian-black py-2 rounded-lg font-semibold hover:bg-aqua-pulse/80 transition"
            >
                Close
            </button>
        </div>
    </div>
);

const PricingModal = ({ onClose, onSubscribe }) => (
    <div className="fixed inset-0 bg-obsidian-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-obsidian-black/90 dark:backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-4xl w-full transform transition-all relative border border-silver-mist/20">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-silver-mist/70 hover:text-silver-mist p-2 rounded-full transition"
            >
                <X className="w-6 h-6" />
            </button>

            <h2 className="font-ui text-3xl font-bold text-deep-teal-byte dark:text-aqua-pulse text-center mb-2">Unlock Your Full Potential</h2>
            <p className="font-body text-deep-teal-byte/80 dark:text-silver-mist/80 text-center mb-8">Choose the plan that's right for your journey.</p>
            
            <div className="grid md:grid-cols-3 gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => (
                    <div 
                        key={plan.id} 
                        className={`p-6 rounded-xl shadow-lg border-2 flex flex-col transition-all duration-300 ${
                            plan.highlight 
                                ? 'border-aqua-pulse bg-deep-teal-byte/5 dark:bg-deep-teal-byte/20 transform scale-105' 
                                : 'border-silver-mist/20 bg-white dark:bg-obsidian-black hover:shadow-xl'
                        }`}
                    >
                        {plan.highlight && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-aqua-pulse text-obsidian-black text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                Recommended
                            </div>
                        )}
                        <h3 className="font-ui text-2xl font-bold text-deep-teal-byte dark:text-silver-mist mb-1">{plan.name}</h3>
                        <p className={`font-ui text-sm font-semibold mb-4 ${plan.highlight ? 'text-aqua-pulse' : 'text-deep-teal-byte/70 dark:text-silver-mist/70'}`}>{plan.tag}</p>
                        
                        <div className="flex items-end mb-6">
                            <span className="font-logo text-5xl font-extrabold text-deep-teal-byte dark:text-silver-mist">{plan.price.split('/')[0]}</span>
                            <span className="font-ui text-xl font-medium text-deep-teal-byte/70 dark:text-silver-mist/70 ml-1">/{plan.interval}</span>
                        </div>

                        <ul className="space-y-3 flex-grow mb-8 font-body">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start text-deep-teal-byte/90 dark:text-silver-mist/90">
                                    <CheckCircle className="w-5 h-5 text-aqua-pulse mr-2 flex-shrink-0" />
                                    <span className="text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => onSubscribe(plan)}
                            className={`w-full py-3 rounded-lg font-bold transition-colors shadow-md font-ui ${
                                plan.highlight 
                                    ? 'bg-aqua-pulse text-obsidian-black hover:bg-aqua-pulse/80' 
                                    : 'bg-deep-teal-byte text-silver-mist hover:bg-deep-teal-byte/80 dark:bg-silver-mist dark:text-obsidian-black dark:hover:bg-silver-mist/80'
                            }`}
                        >
                            {plan.id === 'annual' ? 'Save and Subscribe' : 'Choose Plan'}
                        </button>
                    </div>
                ))}
            </div>

            <p className="font-body text-center text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-6">
                *Subscriptions renew automatically. You can cancel any time via the user profile settings (not implemented in this mock).
            </p>
        </div>
    </div>
);


// ---------------------------------------------------
// IV. FORM COMPONENTS (MOVED OUTSIDE APP & MEMOIZED)
// ---------------------------------------------------

// --- Template: StorySmith Form ---
const StorySmithForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
// ... (Form code is unchanged) ...
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="premise" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Core Premise / Conflict
            </label>
            <textarea
                id="premise"
                name="premise"
                rows="4"
                value={formState.premise}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: A young cartographer discovers his map of the city is actually a living creature's nervous system..."
                required
            ></textarea>
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">What is the central event or main tension?</p>
        </div>
        <div>
            <label htmlFor="mood" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Desired Mood / Tone
            </label>
            <select
                id="mood"
                name="mood"
                value={formState.mood}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {MOOD_OPTIONS.map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="details" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Mandatory Details
            </label>
            <textarea
                id="details"
                name="details"
                rows="3"
                value={formState.details}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: The scent of ozone and old paper..."
            ></textarea>
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">1-3 specific sensory details or character traits.</p>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Generating Soul...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Story</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Life Letter Form ---
const LifeLetterForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
// ... (Form code is unchanged) ...
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="letterType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Type of Letter
            </label>
            <select
                id="letterType"
                name="letterType"
                value={formState.letterType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {LETTER_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="recipient" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Who is this letter for?
            </label>
            <input
                id="recipient"
                name="recipient"
                type="text"
                value={formState.recipient}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: My estranged sister"
                required
            />
        </div>
        <div>
            <label htmlFor="coreMessage" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Your Core Message (Raw Thoughts)
            </label>
            <textarea
                id="coreMessage"
                name="coreMessage"
                rows="5"
                value={formState.coreMessage}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: I'm sorry I missed your wedding. I was scared and dealing with my own issues, but it was selfish. I regret it every day and I want to reconnect."
                required
            ></textarea>
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">Be as messy as you need. ReFURRMed Ink will clean it up.</p>
        </div>
        <div>
            <label htmlFor="tone" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                4. Desired Tone
            </label>
            <select
                id="tone"
                name="tone"
                value={formState.tone}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {TONE_OPTIONS.map(tone => (
                    <option key={tone} value={tone}>{tone}</option>
                ))}
            </select>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Writing Your Letter...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Letter</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Prompt Architect Form ---
const PromptArchitectForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
// ... (Form code is unchanged) ...
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Subject
            </label>
            <input
                id="subject"
                name="subject"
                type="text"
                value={formState.subject}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: 18th Century French History"
                required
            />
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">What topic is the prompt about?</p>
        </div>
        <div>
            <label htmlFor="goal" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Goal
            </label>
            <input
                id="goal"
                name="goal"
                type="text"
                value={formState.goal}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Write a 5-paragraph essay on the causes of the French Revolution"
                required
            />
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">What should the AI's final output achieve?</p>
        </div>
        <div>
            <label htmlFor="persona" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. AI Persona (Optional)
            </label>
            <input
                id="persona"
                name="persona"
                type="text"
                value={formState.persona}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: A witty college professor"
            />
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">What role should the AI play?</p>
        </div>
        <div>
            <label htmlFor="constraints" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                4. Constraints (Optional)
            </label>
            <textarea
                id="constraints"
                name="constraints"
                rows="3"
                value={formState.constraints}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Use simple language. Output as bullet points. Avoid mentioning Napoleon."
            ></textarea>
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">Any specific rules or formats to follow?</p>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Building Prompt...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Prompt</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Brand Voice Form ---
const BrandVoiceForm = React.memo(({ formState, onChange, onBlur, onSubmit, isGenerating, error }) => (
// ... (Form code is unchanged) ...
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="brandName" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Brand Name
            </label>
            <input
                id="brandName"
                name="brandName"
                type="text"
                value={formState.brandName}
                onChange={onChange}
                onBlur={onBlur} // NEW: Save on blur
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Crow & Rose"
                required
            />
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">This will be auto-saved to your profile.</p>
        </div>
        <div>
            <label htmlFor="productService" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Product / Service
            </label>
            <input
                id="productService"
                name="productService"
                type="text"
                value={formState.productService}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Small-batch artisanal coffee"
                required
            />
        </div>
        <div>
            <label htmlFor="audience" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Target Audience
            </label>
            <input
                id="audience"
                name="audience"
                type="text"
                value={formState.audience}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Young professionals who value quality and sustainability"
                required
            />
        </div>
        <div>
            <label htmlFor="keyValues" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                4. Key Values (3-5 words)
            </label>
            <input
                id="keyValues"
                name="keyValues"
                type="text"
                value={formState.keyValues}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Authentic, Witty, Premium, Sustainable"
                required
            />
        </div>
        <div>
            <label htmlFor="outputType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                5. Desired Output
            </label>
            <select
                id="outputType"
                name="outputType"
                value={formState.outputType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {BRAND_OUTPUT_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Building Brand...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Copy</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Homework Helper Form ---
const HomeworkHelperForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
// ... (Form code is unchanged) ...
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Subject
            </label>
            <input
                id="subject"
                name="subject"
                type="text"
                value={formState.subject}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Algebra 2"
                required
            />
        </div>
        <div>
            <label htmlFor="question" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Question / Concept
            </label>
            <textarea
                id="question"
                name="question"
                rows="5"
                value={formState.question}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: What is the quadratic formula and why does it work?"
                required
            ></textarea>
        </div>
        <div>
            <label htmlFor="helpType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Type of Help Needed
            </label>
            <select
                id="helpType"
                name="helpType"
                value={formState.helpType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {HELP_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">If 'Check my answer', please include your answer in the question box above.</p>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Explaining...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Get Help</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Small Business Assistant Form ---
const BusinessAssistantForm = React.memo(({ formState, onChange, onBlur, onSubmit, isGenerating, error }) => (
// ... (Form code is unchanged) ...
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="documentType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Document Type
            </label>
            <select
                id="documentType"
                name="documentType"
                value={formState.documentType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {BUSINESS_DOC_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="businessName" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Business Name
            </label>
            <input
                id="businessName"
                name="businessName"
                type="text"
                value={formState.businessName}
                onChange={onChange}
                onBlur={onBlur} // NEW: Save on blur
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: ReFURRMed Ink AI"
                required
            />
            <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 mt-1">This will be auto-saved to your profile.</p>
        </div>
        <div>
            <label htmlFor="keyDetails" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Key Details
            </label>
            <textarea
                id="keyDetails"
                name="keyDetails"
                rows="6"
                value={formState.keyDetails}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder={`Provide all details needed for the document.
- For INVOICE: Client name, items, costs...
- For BUSINESS PLAN: Section title (e.g., Executive Summary) and key points...
- For LETTERHEAD: Company address, phone, logo description, desired style...`}
                required
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Generating Document...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Document</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Digital Product Factory Form ---
const DigitalProductForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="productType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Product Type
            </label>
            <select
                id="productType"
                name="productType"
                value={formState.productType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {DIGITAL_PRODUCT_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="topic" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Main Topic
            </label>
            <input
                id="topic"
                name="topic"
                type="text"
                value={formState.topic}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: The Basics of Container Gardening"
                required
            />
        </div>
        <div>
            <label htmlFor="audience" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Target Audience
            </label>
            <input
                id="audience"
                name="audience"
                type="text"
                value={formState.audience}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: City dwellers with no yard space"
                required
            />
        </div>
        <div>
            <label htmlFor="keyTakeaways" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                4. Key Takeaways (3-5 points)
            </label>
            <textarea
                id="keyTakeaways"
                name="keyTakeaways"
                rows="3"
                value={formState.keyTakeaways}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: 1. Choosing the right pots. 2. Best soil mixes. 3. Watering schedules."
                required
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Writing Your Product...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Create Product Content</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Market Needs Analyzer Form ---
const MarketNeedsForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="marketNiche" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Market / Niche
            </label>
            <input
                id="marketNiche"
                name="marketNiche"
                type="text"
                value={formState.marketNiche}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Homebrewing coffee"
                required
            />
        </div>
        <div>
            <label htmlFor="targetAudience" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Target Audience
            </label>
            <input
                id="targetAudience"
                name="targetAudience"
                type="text"
                value={formState.targetAudience}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Beginners who are intimidated by complex equipment"
                required
            />
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Analyzing Market...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Discover Needs</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Code Sidekick Form ---
const CodeSidekickForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="language" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Language
            </label>
            <select
                id="language"
                name="language"
                value={formState.language}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {LANGUAGE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="goal" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Goal / Task
            </label>
            <input
                id="goal"
                name="goal"
                type="text"
                value={formState.goal}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Create a responsive 'Contact Us' form"
                required
            />
        </div>
        <div>
            <label htmlFor="requirements" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Requirements (Optional)
            </label>
            <textarea
                id="requirements"
                name="requirements"
                rows="4"
                value={formState.requirements}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Must include Name, Email, and Message fields. Use Tailwind CSS for styling."
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Writing Code...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Code</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Legacy Keeper Form ---
const LegacyKeeperForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="fragments" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                Paste Your Notes & Memories
            </label>
            <textarea
                id="fragments"
                name="fragments"
                rows="15"
                value={formState.fragments}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Paste all your messy notes, drafts, and story fragments here. Don't worry about the order. The AI will organize it all into a clean, readable document."
                required
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Organizing Your Story...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Put It All Together</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Caption Witch Form ---
const CaptionWitchForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="platform" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Platform
            </label>
            <select
                id="platform"
                name="platform"
                value={formState.platform}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {PLATFORM_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="topic" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Post Topic / Idea
            </label>
            <textarea
                id="topic"
                name="topic"
                rows="4"
                value={formState.topic}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: A photo of my new product, a video of my dog, a motivational quote"
                required
            ></textarea>
        </div>
        <div>
            <label htmlFor="flavor" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Desired Flavor
            </label>
            <select
                id="flavor"
                name="flavor"
                value={formState.flavor}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {FLAVOR_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Casting Spell...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Captions</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Ad Copy Alchemist Form ---
const AdCopyAlchemistForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="adType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Ad Format
            </label>
            <select
                id="adType"
                name="adType"
                value={formState.adType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {AD_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="productName" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Product / Service Name
            </label>
            <input
                id="productName"
                name="productName"
                type="text"
                value={formState.productName}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: ReFURRMed Ink AI"
                required
            />
        </div>
        <div>
            <label htmlFor="targetAudience" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Target Audience
            </label>
            <input
                id="targetAudience"
                name="targetAudience"
                type="text"
                value={formState.targetAudience}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Coaches and creative entrepreneurs"
                required
            />
        </div>
        <div>
            <label htmlFor="keyBenefit" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                4. Key Benefit / Pain Point
            </label>
            <textarea
                id="keyBenefit"
                name="keyBenefit"
                rows="3"
                value={formState.keyBenefit}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Saves time writing marketing copy, overcomes writer's block"
                required
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Transmuting Ideas...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Ad Copy</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: AI Logo Generator Form ---
const AiLogoGeneratorForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="companyName" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Company Name
            </label>
            <input
                id="companyName"
                name="companyName"
                type="text"
                value={formState.companyName}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: ReFURRMed Ink"
                required
            />
        </div>
        <div>
            <label htmlFor="style" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Desired Style
            </label>
            <select
                id="style"
                name="style"
                value={formState.style}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {LOGO_STYLE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="colors" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Key Colors (Optional)
            </label>
            <input
                id="colors"
                name="colors"
                type="text"
                value={formState.colors}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Deep teal and silver"
            />
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Designing Logo...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Generate Logo</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Resume Repair Lab Form ---
const ResumeRepairForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="targetJob" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Target Job Title
            </label>
            <input
                id="targetJob"
                name="targetJob"
                type="text"
                value={formState.targetJob}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Senior Project Manager"
                required
            />
        </div>
        <div>
            <label htmlFor="industry" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Industry
            </label>
            <input
                id="industry"
                name="industry"
                type="text"
                value={formState.industry}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Tech / SaaS"
                required
            />
        </div>
        <div>
            <label htmlFor="currentResume" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Current Resume Text (Paste Here)
            </label>
            <textarea
                id="currentResume"
                name="currentResume"
                rows="8"
                value={formState.currentResume}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Paste your existing resume or rough work history here..."
                required
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Repairing Resume...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Polish Resume</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Template: Email Surgeon Form ---
const EmailSurgeonForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="recipient" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Recipient
            </label>
            <input
                id="recipient"
                name="recipient"
                type="text"
                value={formState.recipient}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: My Boss, A Difficult Client"
                required
            />
        </div>
        <div>
            <label htmlFor="goal" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Goal
            </label>
            <input
                id="goal"
                name="goal"
                type="text"
                value={formState.goal}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Example: Ask for a raise, Decline a project"
                required
            />
        </div>
        <div>
            <label htmlFor="draftEmail" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                3. Draft / Messy Email
            </label>
            <textarea
                id="draftEmail"
                name="draftEmail"
                rows="5"
                value={formState.draftEmail}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Paste your draft here. Don't worry if it's emotional or messy."
                required
            ></textarea>
        </div>
        <div>
            <label htmlFor="tone" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                4. Desired Tone
            </label>
            <select
                id="tone"
                name="tone"
                value={formState.tone}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {EMAIL_TONE_OPTIONS.map(tone => (
                    <option key={tone} value={tone}>{tone}</option>
                ))}
            </select>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Operating...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Fix Email</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- NEW Template: Contract Clarifier Form ---
const ContractClarifierForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div>
            <label htmlFor="contractType" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                1. Type of Document
            </label>
            <select
                id="contractType"
                name="contractType"
                value={formState.contractType}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
            >
                {CONTRACT_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="contractText" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                2. Paste Contract Text
            </label>
            <textarea
                id="contractText"
                name="contractText"
                rows="10"
                value={formState.contractText}
                onChange={onChange}
                className="font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm"
                placeholder="Paste the dense legal text here..."
                required
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors ${
                isGenerating 
                    ? 'bg-deep-teal-byte/50 text-silver-mist/70 cursor-not-allowed' 
                    : 'bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80'
            }`}
        >
            {isGenerating ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Analyzing Legal Text...</>
            ) : (
                <><Send className="w-5 h-5 mr-2" /> Clarify Contract</>
            )}
        </button>
        {error && <p className="font-body text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

// --- Main Application Component ---
const App = () => {
    // 1. Firebase State
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [auth, setAuth] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    // 2. App State
    const [currentView, setCurrentView] = useState('template'); // 'template' or 'history'
    const [currentTemplate, setCurrentTemplate] = useState('marketNeeds'); // Default to new template
    const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [openCategories, setOpenCategories] = useState(['business', 'personal', 'utility']); // State for categories

    // 3. Form States (UPDATED)
    const [storyFormState, setStoryFormState] = useState(initialStoryFormState);
    const [letterFormState, setLetterFormState] = useState(initialLetterFormState); 
    const [promptArchitectFormState, setPromptArchitectFormState] = useState(initialPromptArchitectFormState);
    const [brandVoiceFormState, setBrandVoiceFormState] = useState(initialBrandVoiceFormState);
    const [homeworkHelperFormState, setHomeworkHelperFormState] = useState(initialHomeworkHelperFormState);
    const [businessAssistantFormState, setBusinessAssistantFormState] = useState(initialBusinessAssistantFormState); 
    const [digitalProductFormState, setDigitalProductFormState] = useState(initialDigitalProductFormState);
    const [marketNeedsFormState, setMarketNeedsFormState] = useState(initialMarketNeedsFormState); 
    const [codeSidekickFormState, setCodeSidekickFormState] = useState(initialCodeSidekickFormState);
    const [legacyKeeperFormState, setLegacyKeeperFormState] = useState(initialLegacyKeeperFormState); 
    const [captionWitchFormState, setCaptionWitchFormState] = useState(initialCaptionWitchFormState);
    const [adCopyAlchemistFormState, setAdCopyAlchemistFormState] = useState(initialAdCopyAlchemistFormState);
    const [aiLogoGeneratorFormState, setAiLogoGeneratorFormState] = useState(initialAiLogoGeneratorFormState);
    const [resumeRepairFormState, setResumeRepairFormState] = useState(initialResumeRepairFormState); 
    const [emailSurgeonFormState, setEmailSurgeonFormState] = useState(initialEmailSurgeonFormState); 
    const [contractClarifierFormState, setContractClarifierFormState] = useState(initialContractClarifierFormState); // NEW

    // 4. Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const [generatedImage, setGeneratedImage] = useState(''); 
    const [projectTitle, setProjectTitle] = useState('');
    const [error, setError] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [copyStatus, setCopyStatus] = useState(null);

    // ---------------------------------------------------
    // I. FIREBASE INITIALIZATION AND AUTHENTICATION
    // ---------------------------------------------------
    useEffect(() => {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
            setError("Firebase configuration is missing or empty. Cannot initialize.");
            return;
        }
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const firestore = getFirestore(app);
            setAuth(authInstance);
            setDb(firestore);
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                try {
                    if (!user) {
                        if (initialAuthToken) {
                            await signInWithCustomToken(authInstance, initialAuthToken);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    }
                    const currentUid = authInstance.currentUser?.uid || crypto.randomUUID();
                    setUserId(currentUid);
                    setIsAuthReady(true);
                } catch (e) {
                    setError(`Authentication failed: ${e.message}`);
                }
            });
            return () => unsubscribe();
        } catch (e) {
            setError(`Firebase Initialization Error: ${e.message}`);
        }
    }, []);

    // ---------------------------------------------------
    // II. FIRESTORE DATA LISTENERS
    // ---------------------------------------------------
    // User Profile listener (sets default to 'pro')
    useEffect(() => {
        if (!isAuthReady || !db || !userId || !auth) return;
        if (!auth.currentUser) return;
        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'user_data', 'profile');
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            const profileData = docSnap.exists() ? docSnap.data() : { subscriptionStatus: 'pro', email: auth.currentUser?.email || 'N/A' }; // Default to 'pro'
            setUserProfile(profileData);
            if (!docSnap.exists()) {
                 setDoc(userDocRef, {
                    subscriptionStatus: 'pro', // <-- Set new users to 'pro' for testing
                    email: auth.currentUser?.email || 'anonymous',
                    stripeCustomerId: null,
                    createdAt: serverTimestamp(),
                    businessName: '', // NEW: Add businessName to profile
                 }, { merge: true }).catch(e => console.error("Error creating profile:", e));
            }
        }, (e) => {
            console.error("Error fetching user profile:", e);
        });
        return () => unsubscribe();
    }, [isAuthReady, db, userId, auth]);

    // Projects listener
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const projectsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'projects');
        const projectsQuery = query(projectsCollectionRef);
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const loadedProjects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleDateString() : 'N/A'
            }));
            loadedProjects.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setProjects(loadedProjects);
        }, (e) => {
            console.error("Error fetching projects:", e);
        });
        return () => unsubscribe();
    }, [isAuthReady, db, userId]);

    // Dark Mode Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);
    
    // Effect to pre-fill business name in forms
    useEffect(() => {
        if (currentTemplate === 'smallBusiness' && userProfile?.businessName && !businessAssistantFormState.businessName) {
            setBusinessAssistantFormState(prev => ({
                ...prev,
                businessName: userProfile.businessName
            }));
        }
        if (currentTemplate === 'brandVoice' && userProfile?.businessName && !brandVoiceFormState.brandName) {
            setBrandVoiceFormState(prev => ({
                ...prev,
                brandName: userProfile.businessName
            }));
        }
    }, [currentTemplate, userProfile, businessAssistantFormState.businessName, brandVoiceFormState.brandName]);


    // ---------------------------------------------------
    // III. CORE LOGIC FUNCTIONS
    // ---------------------------------------------------

    // UPDATED: Handlers for separate forms
    const handleStoryFormChange = (e) => {
        const { name, value } = e.target;
        setStoryFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleLetterFormChange = (e) => {
        const { name, value } = e.target;
        setLetterFormState(prev => ({ ...prev, [name]: value }));
    };

    const handlePromptArchitectFormChange = (e) => {
        const { name, value } = e.target;
        setPromptArchitectFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleBrandVoiceFormChange = (e) => {
        const { name, value } = e.target;
        setBrandVoiceFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleHomeworkHelperFormChange = (e) => {
        const { name, value } = e.target;
        setHomeworkHelperFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleBusinessAssistantFormChange = (e) => {
        const { name, value } = e.target;
        setBusinessAssistantFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDigitalProductFormChange = (e) => {
        const { name, value } = e.target;
        setDigitalProductFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleMarketNeedsFormChange = (e) => {
        const { name, value } = e.target;
        setMarketNeedsFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCodeSidekickFormChange = (e) => {
        const { name, value } = e.target;
        setCodeSidekickFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLegacyKeeperFormChange = (e) => {
        const { name, value } = e.target;
        setLegacyKeeperFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleCaptionWitchFormChange = (e) => {
        const { name, value } = e.target;
        setCaptionWitchFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleAdCopyAlchemistFormChange = (e) => {
        const { name, value } = e.target;
        setAdCopyAlchemistFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleAiLogoGeneratorFormChange = (e) => {
        const { name, value } = e.target;
        setAiLogoGeneratorFormState(prev => ({ ...prev, [name]: value }));
    };
    
    // NEW: Handlers for Resume Repair, Email Surgeon, Contract Clarifier
    const handleResumeRepairFormChange = (e) => {
        const { name, value } = e.target;
        setResumeRepairFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleEmailSurgeonFormChange = (e) => {
        const { name, value } = e.target;
        setEmailSurgeonFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleContractClarifierFormChange = (e) => {
        const { name, value } = e.target;
        setContractClarifierFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleBusinessNameBlur = useCallback(async (e) => {
        const newBusinessName = e.target.value.trim();
        if (!db || !userId || !newBusinessName || newBusinessName === userProfile?.businessName) {
            return; // No need to update
        }

        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'user_data', 'profile');
        try {
            await updateDoc(userDocRef, {
                businessName: newBusinessName
            });
        } catch (err) {
            console.error("Failed to save business name:", err);
        }
    }, [db, userId, userProfile]);

    const handleTemplateChange = (template) => {
        if (template === currentTemplate) return;
        setCurrentTemplate(template);
        setGeneratedText('');
        setGeneratedImage(''); 
        setProjectTitle('');
        setError(null);
    };

    const handleSubscriptionClick = useCallback((plan) => {
        setShowPricingModal(false);
        const MOCK_STRIPE_URL = `https://mock.stripe.com/checkout/session_id_${plan.id}_12345`;
        setAlertMessage(
            `Initiating checkout for the **${plan.name}** plan (${plan.price}/${plan.interval}). 
            In a production app, you would be redirected to a secure URL (like: ${MOCK_STRIPE_URL}) 
            to complete the payment. After payment, your status would automatically update here.`
        );
    }, []);

    const toggleCategory = (category) => {
        setOpenCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };


    /**
     * UPDATED: Handles generation for ANY active template.
     */
    const generateContent = useCallback(async (e) => {
        e.preventDefault();

        if (userProfile?.subscriptionStatus !== 'pro' && userProfile?.subscriptionStatus !== 'executive') { 
            setAlertMessage("This feature is reserved for **Pro members**. Please upgrade your subscription to unlock unlimited generations!");
            return;
        }

        setIsGenerating(true);
        setGeneratedText('');
        setGeneratedImage(''); 
        setError(null);

        let userPrompt = '';
        let systemPrompt = '';
        let isValid = false;
        let apiUrl = TEXT_API_URL;
        let payload = {};

        if (currentTemplate === 'aiLogoGenerator') { 
            if (aiLogoGeneratorFormState.companyName.trim()) {
                userPrompt = `A ${aiLogoGeneratorFormState.style}, professional logo for a company named '${aiLogoGeneratorFormState.companyName}'. ${aiLogoGeneratorFormState.colors ? `Key colors: ${aiLogoGeneratorFormState.colors}.` : ''} Minimalist, vector, on a white background.`;
                apiUrl = IMAGE_API_URL;
                payload = {
                    instances: [{ prompt: userPrompt }], 
                    parameters: { sampleCount: 1 }
                };
                isValid = true;
            } else {
                setAlertMessage("Please provide a Company Name.");
            }
        } else {
            // --- All other text-based templates ---
            if (currentTemplate === 'storySmith') {
                if (storyFormState.premise.trim()) {
                    userPrompt = `Core Premise/Conflict: "${storyFormState.premise}". Desired Mood/Tone: "${storyFormState.mood}". Mandatory Details to include: "${storyFormState.details}". Write the scene now.`;
                    systemPrompt = STORY_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Core Premise/Conflict to start your story.");
                }
            } else if (currentTemplate === 'lifeLetter') { 
                if (letterFormState.coreMessage.trim() && letterFormState.recipient.trim()) {
                    userPrompt = `I need to write a letter.
                    Type: "${letterFormState.letterType}", Recipient: "${letterFormState.recipient}", 
                    Core Message: "${letterFormState.coreMessage}", Desired Tone: "${letterFormState.tone}".
                    Write the letter.`;
                    systemPrompt = LIFE_LETTER_SYSTEM_PROMPT; 
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Recipient and Core Message to write your letter.");
                }
            } else if (currentTemplate === 'promptArchitect') {
                if (promptArchitectFormState.subject.trim() && promptArchitectFormState.goal.trim()) {
                    userPrompt = `I need a prompt.
                    Subject: "${promptArchitectFormState.subject}", Goal: "${promptArchitectFormState.goal}",
                    Persona: "${promptArchitectFormState.persona || 'Expert'}", Constraints: "${promptArchitectFormState.constraints || 'None'}".
                    Generate the prompt.`;
                    systemPrompt = PROMPT_ARCHITECT_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Subject and a Goal for your prompt.");
                }
            } else if (currentTemplate === 'brandVoice') {
                if (brandVoiceFormState.brandName.trim() && brandVoiceFormState.productService.trim() && brandVoiceFormState.audience.trim() && brandVoiceFormState.keyValues.trim()) {
                    userPrompt = `I need brand copy.
                    Brand Name: "${brandVoiceFormState.brandName}", Product/Service: "${brandVoiceFormState.productService}",
                    Target Audience: "${brandVoiceFormState.audience}", Core Values: "${brandVoiceFormState.keyValues}",
                    Output Type: "${brandVoiceFormState.outputType}".
                    Write the brand copy.`;
                    systemPrompt = BRAND_VOICE_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please fill out all required fields for the Brand Voice Builder.");
                }
            } else if (currentTemplate === 'homeworkHelper') {
                if (homeworkHelperFormState.subject.trim() && homeworkHelperFormState.question.trim()) {
                    userPrompt = `I need help with my homework.
                    Subject: "${homeworkHelperFormState.subject}"
                    Question: "${homeworkHelperFormState.question}"
                    Help Type: "${homeworkHelperFormState.helpType}"`;
                    systemPrompt = HOMEWORK_HELPER_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Subject and Question.");
                }
            } else if (currentTemplate === 'smallBusiness') { 
                if (businessAssistantFormState.businessName.trim() && businessAssistantFormState.keyDetails.trim()) {
                    userPrompt = `I need a business document.
                    Business Name: "${businessAssistantFormState.businessName}"
                    Document Type: "${businessAssistantFormState.documentType}"
                    Key Details: "${businessAssistantFormState.keyDetails}"
                    
                    Please generate the document.`;
                    systemPrompt = BUSINESS_ASSISTANT_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Business Name and Key Details.");
                }
            } else if (currentTemplate === 'digitalProduct') {
                if (digitalProductFormState.topic.trim() && digitalProductFormState.audience.trim() && digitalProductFormState.keyTakeaways.trim()) {
                    userPrompt = `I need to create a digital product.
                    Product Type: "${digitalProductFormState.productType}"
                    Main Topic: "${digitalProductFormState.topic}"
                    Target Audience: "${digitalProductFormState.audience}"
                    Key Takeaways: "${digitalProductFormState.keyTakeaways}"
                    
                    Please generate the full content as requested by the system prompt.`;
                    systemPrompt = DIGITAL_PRODUCT_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please fill out all fields to generate your product content.");
                }
            } else if (currentTemplate === 'marketNeeds') { 
                if (marketNeedsFormState.marketNiche.trim() && marketNeedsFormState.targetAudience.trim()) {
                    userPrompt = `I need to discover market needs.
                    Market / Niche: "${marketNeedsFormState.marketNiche}"
                    Target Audience: "${marketNeedsFormState.targetAudience}"
                    
                    Please generate the analysis.`;
                    systemPrompt = MARKET_NEEDS_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Market/Niche and a Target Audience.");
                }
            } else if (currentTemplate === 'codeSidekick') { 
                if (codeSidekickFormState.goal.trim()) {
                    userPrompt = `I need help with coding.
                    Language: "${codeSidekickFormState.language}"
                    Goal/Task: "${codeSidekickFormState.goal}"
                    Requirements: "${codeSidekickFormState.requirements || 'None'}"
                    
                    Please generate the code or explanation.`;
                    systemPrompt = CODE_SIDEKICK_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Goal/Task for the Code Sidekick.");
                }
            } else if (currentTemplate === 'legacyKeeper') { 
                if (legacyKeeperFormState.fragments.trim()) {
                    userPrompt = `Here are my fragmented notes and memories. Please "Put It All Together" into a clean, readable narrative.
                    
                    ---
                    ${legacyKeeperFormState.fragments}
                    ---`;
                    systemPrompt = LEGACY_KEEPER_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please paste your notes and fragments into the text area.");
                }
            } else if (currentTemplate === 'captionWitch') { 
                if (captionWitchFormState.topic.trim()) {
                    userPrompt = `I need social media captions.
                    Platform: "${captionWitchFormState.platform}"
                    Topic: "${captionWitchFormState.topic}"
                    Flavor: "${captionWitchFormState.flavor}"
                    
                    Generate 3-5 captions with hashtags.`;
                    systemPrompt = CAPTION_WITCH_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please provide a Post Topic.");
                }
            } else if (currentTemplate === 'adCopyAlchemist') { 
                if (adCopyAlchemistFormState.productName.trim() && adCopyAlchemistFormState.targetAudience.trim() && adCopyAlchemistFormState.keyBenefit.trim()) {
                    userPrompt = `I need ad copy.
                    Product: "${adCopyAlchemistFormState.productName}"
                    Audience: "${adCopyAlchemistFormState.targetAudience}"
                    Key Benefit: "${adCopyAlchemistFormState.keyBenefit}"
                    Ad Format: "${adCopyAlchemistFormState.adType}"
                    
                    Generate 3-5 variations.`;
                    systemPrompt = AD_COPY_ALCHEMIST_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please fill out all fields for the Ad Copy Alchemist.");
                }
            } else if (currentTemplate === 'resumeRepair') { 
                if (resumeRepairFormState.currentResume.trim()) {
                    userPrompt = `I need my resume repaired.
                    Target Job: "${resumeRepairFormState.targetJob}"
                    Industry: "${resumeRepairFormState.industry}"
                    
                    Current Resume Text:
                    ${resumeRepairFormState.currentResume}
                    
                    Please rewrite and polish it.`;
                    systemPrompt = RESUME_REPAIR_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please paste your resume text.");
                }
            } else if (currentTemplate === 'emailSurgeon') { 
                if (emailSurgeonFormState.draftEmail.trim()) {
                    userPrompt = `I need an email fixed.
                    Recipient: "${emailSurgeonFormState.recipient}"
                    Goal: "${emailSurgeonFormState.goal}"
                    Tone: "${emailSurgeonFormState.tone}"
                    
                    Draft Email:
                    ${emailSurgeonFormState.draftEmail}
                    
                    Please perform surgery on this email.`;
                    systemPrompt = EMAIL_SURGEON_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please paste your draft email.");
                }
            } else if (currentTemplate === 'contractClarifier') { // NEW
                if (contractClarifierFormState.contractText.trim()) {
                    userPrompt = `I need a contract clarified.
                    Contract Type: "${contractClarifierFormState.contractType}"
                    
                    Contract Text:
                    ${contractClarifierFormState.contractText}
                    
                    Please analyze and clarify.`;
                    systemPrompt = CONTRACT_CLARIFIER_SYSTEM_PROMPT;
                    isValid = true;
                } else {
                    setAlertMessage("Please paste the contract text.");
                }
            }
            
            // Final payload for text models
            if (isValid) {
                payload = {
                    contents: [{ parts: [{ text: userPrompt }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                };
            }
        }


        if (!isValid) {
            setIsGenerating(false); // Stop loading if not valid
            return;
        }

        // 3. API Call with backoff
        let attempts = 0;
        const maxAttempts = 5;

        const fetchData = async () => {
            try {
                const response = await fetch(apiUrl + API_KEY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(`API Request failed: ${response.status} - ${errorBody.error?.message || 'Unknown error'}`);
                }
                const result = await response.json();
                
                // Handle response based on template type
                if (currentTemplate === 'aiLogoGenerator') {
                    const base64Data = result.predictions?.[0]?.bytesBase64Encoded;
                    if (base64Data) {
                        setGeneratedImage(`data:image/png;base64,${base64Data}`);
                    } else {
                        throw new Error("No image data returned from API.");
                    }
                } else {
                    // Text models
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated. The model may have been blocked or failed to produce output.";
                    setGeneratedText(text);
                }

            } catch (err) {
                console.error(`Attempt ${attempts + 1} failed:`, err);
                if (attempts < maxAttempts - 1) {
                    const delay = Math.pow(2, attempts) * 1000 + Math.random() * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempts++;
                    await fetchData();
                } else {
                    setError(`Failed to generate content after ${maxAttempts} attempts. Error: ${err.message}`);
                    setGeneratedText("Generation failed. Please check the console for details."); 
                }
            }
        };

        await fetchData();
        setIsGenerating(false);

    }, [currentTemplate, userProfile, 
        storyFormState, letterFormState, promptArchitectFormState, brandVoiceFormState, homeworkHelperFormState, 
        businessAssistantFormState, digitalProductFormState, marketNeedsFormState, codeSidekickFormState, 
        legacyKeeperFormState, captionWitchFormState, adCopyAlchemistFormState, aiLogoGeneratorFormState,
        resumeRepairFormState, emailSurgeonFormState, contractClarifierFormState // Added new form states
    ]);

    /**
     * UPDATED: Saves the current generated text or image as a new project in Firestore.
     */
    const saveProject = useCallback(async () => {
        // Check for text OR image
        if (!generatedText.trim() && !generatedImage.trim()) {
            setAlertMessage("No generated content to save. Generate content first!");
            return;
        }
        if (!db || !userId) {
            setAlertMessage("Authentication not complete. Please wait a moment and try again.");
            return;
        }

        // Determine which form state to save
        let inputData;
        let contentToSave = generatedText; // Default to text

        if (currentTemplate === 'storySmith') {
            inputData = storyFormState;
        } else if (currentTemplate === 'lifeLetter') { 
            inputData = letterFormState;
        } else if (currentTemplate === 'promptArchitect') {
            inputData = promptArchitectFormState;
        } else if (currentTemplate === 'brandVoice') {
            inputData = brandVoiceFormState;
        } else if (currentTemplate === 'homeworkHelper') {
            inputData = homeworkHelperFormState;
        } else if (currentTemplate === 'smallBusiness') { 
            inputData = businessAssistantFormState;
        } else if (currentTemplate === 'digitalProduct') {
            inputData = digitalProductFormState;
        } else if (currentTemplate === 'marketNeeds') {
            inputData = marketNeedsFormState;
        } else if (currentTemplate === 'codeSidekick') { 
            inputData = codeSidekickFormState;
        } else if (currentTemplate === 'legacyKeeper') { 
            inputData = legacyKeeperFormState;
        } else if (currentTemplate === 'captionWitch') { 
            inputData = captionWitchFormState;
        } else if (currentTemplate === 'adCopyAlchemist') { 
            inputData = adCopyAlchemistFormState;
        } else if (currentTemplate === 'aiLogoGenerator') { 
            inputData = aiLogoGeneratorFormState;
            contentToSave = generatedImage; 
        } else if (currentTemplate === 'resumeRepair') {
            inputData = resumeRepairFormState;
        } else if (currentTemplate === 'emailSurgeon') {
            inputData = emailSurgeonFormState;
        } else if (currentTemplate === 'contractClarifier') { // NEW
            inputData = contractClarifierFormState;
        }

        try {
            const projectsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'projects');
            await addDoc(projectsCollectionRef, {
                userId: userId,
                timestamp: serverTimestamp(),
                title: projectTitle || `Untitled ${currentTemplate} - ${new Date().toLocaleDateString()}`,
                template: currentTemplate, // Save which template was used
                inputData: inputData,       // Save the correct form data
                generatedText: contentToSave, // Save text OR base64 image string
            });

            setAlertMessage("Project successfully saved to your history!");
            setProjectTitle(''); // Clear title after saving
            
        } catch (e) {
            console.error("Error saving project:", e);
            setAlertMessage(`Failed to save project: ${e.message}`);
        }
    }, [db, userId, generatedText, generatedImage, projectTitle, currentTemplate, 
        storyFormState, letterFormState, promptArchitectFormState, brandVoiceFormState, homeworkHelperFormState, 
        businessAssistantFormState, digitalProductFormState, marketNeedsFormState, codeSidekickFormState, 
        legacyKeeperFormState, captionWitchFormState, adCopyAlchemistFormState, aiLogoGeneratorFormState,
        resumeRepairFormState, emailSurgeonFormState, contractClarifierFormState // Added new form states
    ]);

    const handleCopy = () => {
        if (copyToClipboard(generatedText)) {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus(null), 2000);
        } else {
            setCopyStatus('Failed to copy.');
            setTimeout(() => setCopyStatus(null), 2000);
        }
    };
    
    // ---------------------------------------------------
    // IV. VIEWS (Template, History, Detail)
    // ---------------------------------------------------

    /**
     * UPDATED: View for the main template area (editor)
     * This now includes the template switcher and renders the correct form.
     */
    const TemplateView = useMemo(() => {
        let activeTemplateDescription = '';
        if (currentTemplate === 'storySmith') {
            activeTemplateDescription = "Turn your raw ideas into gripping, human-grade scenes.";
        } else if (currentTemplate === 'lifeLetter') { 
            activeTemplateDescription = "Write the hard letters you've been avoiding.";
        } else if (currentTemplate === 'promptArchitect') {
            activeTemplateDescription = "Generate expert-level prompts for other AI models.";
        } else if (currentTemplate === 'brandVoice') {
            activeTemplateDescription = "Write origin stories, about pages, and mission statements with soul.";
        } else if (currentTemplate === 'homeworkHelper') {
            activeTemplateDescription = "Get clear explanations and help with your homework.";
        } else if (currentTemplate === 'smallBusiness') { 
            activeTemplateDescription = "Your AI assistant for business plans, invoices, proposals, and more.";
        } else if (currentTemplate === 'digitalProduct') {
            activeTemplateDescription = "Craft a complete ebook, course, or webinar script from scratch.";
        } else if (currentTemplate === 'marketNeeds') { 
            activeTemplateDescription = "Uncover unfulfilled market needs and customer pain points.";
        } else if (currentTemplate === 'codeSidekick') { 
            activeTemplateDescription = "Your AI pair-programming partner. Generate, debug, or explain code.";
        } else if (currentTemplate === 'legacyKeeper') { 
            activeTemplateDescription = "Organize messy notes and memories into a clean, readable story.";
        } else if (currentTemplate === 'captionWitch') { 
            activeTemplateDescription = "Create social media captions with real personality and flavor.";
        } else if (currentTemplate === 'adCopyAlchemist') { 
            activeTemplateDescription = "Generate high-converting ad copy, hooks, and taglines.";
        } else if (currentTemplate === 'aiLogoGenerator') { 
            activeTemplateDescription = "Generate a professional logo in 60 seconds.";
        } else if (currentTemplate === 'resumeRepair') {
            activeTemplateDescription = "Transform your resume into a powerful, achievement-oriented document.";
        } else if (currentTemplate === 'emailSurgeon') {
            activeTemplateDescription = "Fix, rewrite, or rewire any email to sound professional and effective.";
        } else if (currentTemplate === 'contractClarifier') { // NEW
            activeTemplateDescription = "Understand the fine print. Get clear, plain-English breakdowns of legal documents.";
        }

        const renderActiveForm = () => {
            switch (currentTemplate) {
                case 'storySmith':
                    return <StorySmithForm 
                        formState={storyFormState} 
                        onChange={handleStoryFormChange} 
                        onSubmit={generateContent} 
                        isGenerating={isGenerating} 
                        error={error} 
                    />;
                case 'lifeLetter': 
                    return <LifeLetterForm 
                        formState={letterFormState} 
                        onChange={handleLetterFormChange} 
                        onSubmit={generateContent} 
                        isGenerating={isGenerating} 
                        error={error} 
                    />;
                case 'promptArchitect':
                    return <PromptArchitectForm 
                        formState={promptArchitectFormState} 
                        onChange={handlePromptArchitectFormChange} 
                        onSubmit={generateContent} 
                        isGenerating={isGenerating} 
                        error={error} 
                    />;
                case 'brandVoice':
                    return <BrandVoiceForm 
                        formState={brandVoiceFormState} 
                        onChange={handleBrandVoiceFormChange} 
                        onBlur={handleBusinessNameBlur} 
                        onSubmit={generateContent} 
                        isGenerating={isGenerating} 
                        error={error} 
                    />;
                case 'homeworkHelper':
                    return <HomeworkHelperForm 
                        formState={homeworkHelperFormState} 
                        onChange={handleHomeworkHelperFormChange} 
                        onSubmit={generateContent} 
                        isGenerating={isGenerating} 
                        error={error} 
                    />;
                case 'smallBusiness': 
                    return <BusinessAssistantForm
                        formState={businessAssistantFormState}
                        onChange={handleBusinessAssistantFormChange}
                        onBlur={handleBusinessNameBlur} 
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'digitalProduct':
                    return <DigitalProductForm
                        formState={digitalProductFormState}
                        onChange={handleDigitalProductFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'marketNeeds': 
                    return <MarketNeedsForm
                        formState={marketNeedsFormState}
                        onChange={handleMarketNeedsFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'codeSidekick': 
                    return <CodeSidekickForm
                        formState={codeSidekickFormState}
                        onChange={handleCodeSidekickFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'legacyKeeper': 
                    return <LegacyKeeperForm
                        formState={legacyKeeperFormState}
                        onChange={handleLegacyKeeperFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'captionWitch': 
                    return <CaptionWitchForm
                        formState={captionWitchFormState}
                        onChange={handleCaptionWitchFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'adCopyAlchemist': 
                    return <AdCopyAlchemistForm
                        formState={adCopyAlchemistFormState}
                        onChange={handleAdCopyAlchemistFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'aiLogoGenerator': 
                    return <AiLogoGeneratorForm
                        formState={aiLogoGeneratorFormState}
                        onChange={handleAiLogoGeneratorFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'resumeRepair': 
                    return <ResumeRepairForm
                        formState={resumeRepairFormState}
                        onChange={handleResumeRepairFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'emailSurgeon': 
                    return <EmailSurgeonForm
                        formState={emailSurgeonFormState}
                        onChange={handleEmailSurgeonFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                case 'contractClarifier': // NEW
                    return <ContractClarifierForm
                        formState={contractClarifierFormState}
                        onChange={handleContractClarifierFormChange}
                        onSubmit={generateContent}
                        isGenerating={isGenerating}
                        error={error}
                    />;
                default:
                    return null;
            }
        };
        
        const templateCategories = [
            {
                name: "Business & Marketing",
                id: 'business',
                templates: [
                    { id: 'resumeRepair', name: 'Resume Repair Lab', icon: FileText }, 
                    { id: 'marketNeeds', name: 'Market Needs Analyzer', icon: Search },
                    { id: 'digitalProduct', name: 'Digital Product Factory', icon: BookCopy },
                    { id: 'adCopyAlchemist', name: 'Ad Copy Alchemist', icon: Megaphone }, 
                    { id: 'aiLogoGenerator', name: 'AI Logo Generator', icon: ImageIcon }, 
                    { id: 'smallBusiness', name: 'Business Assistant', icon: Briefcase },
                    { id: 'brandVoice', name: 'Brand Voice', icon: Sparkles },
                ]
            },
            {
                name: "Personal & Creative",
                id: 'personal',
                templates: [
                    { id: 'legacyKeeper', name: 'Legacy Keeper', icon: Heart }, 
                    { id: 'storySmith', name: 'StorySmith', icon: Feather },
                    { id: 'lifeLetter', name: 'Life Letters', icon: Mail }, 
                ]
            },
            {
                name: "Utility & Tools",
                id: 'utility',
                templates: [
                    { id: 'contractClarifier', name: 'Contract Clarifier', icon: Scale }, // NEW
                    { id: 'emailSurgeon', name: 'Email Surgeon', icon: AtSign }, 
                    { id: 'captionWitch', name: 'Caption Witch', icon: Wand2 }, 
                    { id: 'codeSidekick', name: 'Code Sidekick', icon: Code }, 
                    { id: 'promptArchitect', name: 'Prompt Architect', icon: Lightbulb },
                    { id: 'homeworkHelper', name: 'Homework Helper', icon: GraduationCap },
                ]
            }
        ];

        return (
            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                {/* Input Form (Left Panel) */}
                <div className="lg:w-1/3 w-full p-6 bg-gray-100 dark:bg-obsidian-black/50 overflow-y-auto font-ui">
                    <h2 className="font-logo text-3xl font-bold text-deep-teal-byte dark:text-silver-mist mb-6 flex items-center uppercase">
                        <BookOpen className="w-6 h-6 mr-2"/> ReFURRMed Ink
                    </h2>

                    {/* UPDATED: Template Switcher with Categories */}
                    <div className="mb-6">
                        <nav className="flex flex-col space-y-4">
                            {templateCategories.map(category => (
                                <div key={category.id}>
                                    <button 
                                        onClick={() => toggleCategory(category.id)}
                                        className="flex justify-between items-center w-full text-left text-xs uppercase font-semibold tracking-wider text-deep-teal-byte/60 dark:text-silver-mist/60 mb-2"
                                    >
                                        <span>{category.name}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${openCategories.includes(category.id) ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openCategories.includes(category.id) && (
                                        <div className="flex flex-col space-y-2 pl-2 border-l border-silver-mist/30 dark:border-deep-teal-byte/30">
                                            {category.templates.map(template => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => handleTemplateChange(template.id)}
                                                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium w-full text-left ${
                                                        currentTemplate === template.id 
                                                            ? 'bg-deep-teal-byte/10 text-deep-teal-byte dark:bg-aqua-pulse/20 dark:text-aqua-pulse' 
                                                            : 'text-deep-teal-byte/70 dark:text-silver-mist/70 hover:bg-silver-mist dark:hover:bg-deep-teal-byte/40'
                                                    }`}
                                                >
                                                    <template.icon className="w-4 h-4 mr-2" /> 
                                                    <span>{template.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </div>

                    <p className="font-body text-sm text-deep-teal-byte/80 dark:text-silver-mist/80 mb-6">
                        {activeTemplateDescription}
                    </p>
                    
                    {/* Render the correct form */}
                    {renderActiveForm()}
                </div>

                {/* Output Area (Right Panel) */}
                <div className="lg:w-2/3 w-full p-6 overflow-y-auto bg-white dark:bg-obsidian-black font-ui">
                    <h2 className="text-2xl font-bold text-deep-teal-byte dark:text-silver-mist mb-4">Generated Output</h2>
                    <div className="min-h-[40vh] border border-silver-mist/30 dark:border-deep-teal-byte/50 rounded-lg bg-gray-100 dark:bg-obsidian-black p-6 shadow-inner relative">
                        {/* Toolbar */}
                        <div className="flex justify-end space-x-2 mb-3">
                            <button
                                onClick={handleCopy}
                                disabled={!generatedText || isGenerating || currentTemplate === 'aiLogoGenerator'} 
                                className="text-deep-teal-byte/70 dark:text-silver-mist/70 hover:text-aqua-pulse dark:hover:text-aqua-pulse p-2 rounded-full hover:bg-deep-teal-byte/10 dark:hover:bg-deep-teal-byte/40 transition disabled:opacity-50 relative"
                                title="Copy Content"
                            >
                                <Copy className="w-5 h-5" />
                                {copyStatus && (
                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-obsidian-black text-white text-xs rounded-lg whitespace-nowrap">
                                        {copyStatus}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={saveProject}
                                disabled={(!generatedText && !generatedImage) || isGenerating} 
                                className="text-deep-teal-byte/70 dark:text-silver-mist/70 hover:text-aqua-pulse dark:hover:text-aqua-pulse p-2 rounded-full hover:bg-deep-teal-byte/10 dark:hover:bg-deep-teal-byte/40 transition disabled:opacity-50"
                                title="Save to History"
                            >
                                <Save className="w-5 h-5" />
                            </button>
                        </div>

                        {/* NEW: Conditional Output (Text vs Image) */}
                        {isGenerating ? (
                             <div className="text-center py-20 text-deep-teal-byte/70 dark:text-silver-mist/70">
                                <p className="flex items-center justify-center text-lg font-medium">
                                    <Loader className="w-6 h-6 mr-3 animate-spin text-aqua-pulse" />
                                    {currentTemplate === 'storySmith' && 'The StorySmith is weaving your tale...'}
                                    {currentTemplate === 'lifeLetter' && 'ReFURRMed Ink is writing your letter...'}
                                    {currentTemplate === 'promptArchitect' && 'The Architect is building your prompt...'}
                                    {currentTemplate === 'brandVoice' && 'ReFURRMed Ink is building your brand voice...'}
                                    {currentTemplate === 'homeworkHelper' && 'The tutor is preparing your explanation...'}
                                    {currentTemplate === 'smallBusiness' && 'The Assistant is generating your document...'}
                                    {currentTemplate === 'digitalProduct' && 'The Factory is building your product...'}
                                    {currentTemplate === 'marketNeeds' && 'The Analyst is discovering market needs...'}
                                    {currentTemplate === 'codeSidekick' && 'The Sidekick is writing your code...'}
                                    {currentTemplate === 'legacyKeeper' && 'The Keeper is organizing your story...'}
                                    {currentTemplate === 'captionWitch' && 'The Witch is casting a spell...'}
                                    {currentTemplate === 'adCopyAlchemist' && 'The Alchemist is transmuting your ideas...'}
                                    {currentTemplate === 'aiLogoGenerator' && 'The Designer is creating your logo...'}
                                    {currentTemplate === 'resumeRepair' && 'The Coach is polishing your resume...'}
                                    {currentTemplate === 'emailSurgeon' && 'The Surgeon is operating on your email...'}
                                    {currentTemplate === 'contractClarifier' && 'The Analyst is reviewing your document...'}
                                </p>
                            </div>
                        ) : generatedImage ? (
                            <div className="flex justify-center items-center">
                                <img src={generatedImage} alt="Generated Logo" className="max-w-full h-auto rounded-lg shadow-lg" />
                            </div>
                        ) : generatedText ? (
                            <div className={`prose dark:prose-invert max-w-none 
                                            prose-p:font-body prose-headings:font-ui prose-headings:text-deep-teal-byte dark:prose-headings:text-silver-mist
                                            prose-p:text-obsidian-black/80 dark:prose-p:text-silver-mist/90
                                            prose-strong:text-deep-teal-byte dark:prose-strong:text-silver-mist
                                            prose-code:text-cyber-blush prose-code:bg-silver-mist/50 dark:prose-code:bg-deep-teal-byte/30
                                            prose-blockquote:border-aqua-pulse prose-blockquote:text-deep-teal-byte/80 dark:prose-blockquote:text-silver-mist/80
                                            ${(currentTemplate === 'promptArchitect' || currentTemplate === 'smallBusiness' || currentTemplate === 'codeSidekick' || currentTemplate === 'adCopyAlchemist' || currentTemplate === 'resumeRepair' || currentTemplate === 'contractClarifier') ? 'font-mono text-sm' : 'font-body'} 
                                            leading-relaxed`}>
                                {generatedText.split('\n').map((line, index) => (
                                    <p key={index} className="mb-4">{line}</p>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-deep-teal-byte/70 dark:text-silver-mist/70">
                                <p className="text-lg">Your masterpiece will appear here.</p>
                                <p className="font-body text-sm mt-2">Fill out the form on the left to begin.</p>
                            </div>
                        )}

                        {/* Title Input */}
                        {(generatedText || generatedImage) && (
                            <div className="mt-8">
                                <label htmlFor="projectTitle" className="block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1">
                                    Project Title (Optional)
                                </label>
                                <input
                                    id="projectTitle"
                                    name="projectTitle"
                                    type="text"
                                    value={projectTitle}
                                    onChange={(e) => setProjectTitle(e.target.value)}
                                    className="font-body w-full border-silver-mist/50 dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-2 text-sm"
                                    placeholder="Enter a title before saving"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }, [currentTemplate, isGenerating, generatedText, generatedImage, projectTitle, generateContent, saveProject, handleCopy, copyStatus, error, userProfile, openCategories, 
        storyFormState, letterFormState, promptArchitectFormState, brandVoiceFormState, homeworkHelperFormState, 
        businessAssistantFormState, digitalProductFormState, marketNeedsFormState, codeSidekickFormState, 
        legacyKeeperFormState, captionWitchFormState, adCopyAlchemistFormState, aiLogoGeneratorFormState,
        resumeRepairFormState, emailSurgeonFormState, contractClarifierFormState, // Added new form states
        handleBusinessNameBlur
    ]); // Keep form states here for renderActiveForm


    /**
     * UPDATED: View for displaying the saved project history.
     * Now shows a badge for the template type.
     */
    const HistoryView = useMemo(() => {
        const getTemplateBadge = (template) => {
            switch (template) {
                case 'lifeLetter': 
                    return <span className="bg-aqua-pulse/20 text-aqua-pulse">Letter</span>;
                case 'promptArchitect':
                    return <span className="bg-neural-violet/20 text-neural-violet">Prompt</span>;
                case 'brandVoice':
                    return <span className="bg-cyber-blush/20 text-cyber-blush">Brand</span>;
                case 'homeworkHelper':
                    return <span className="bg-red-400/20 text-red-400">Homework</span>;
                case 'smallBusiness': 
                    return <span className="bg-cyan-400/20 text-cyan-400">Business</span>;
                case 'digitalProduct':
                    return <span className="bg-orange-400/20 text-orange-400">Product</span>;
                case 'marketNeeds': 
                    return <span className="bg-teal-400/20 text-teal-400">Market</span>;
                case 'codeSidekick':
                    return <span className="bg-blue-400/20 text-blue-400">Code</span>;
                case 'legacyKeeper': 
                    return <span className="bg-pink-400/20 text-pink-400">Legacy</span>;
                case 'captionWitch': 
                    return <span className="bg-purple-400/20 text-purple-400">Caption</span>;
                case 'adCopyAlchemist': 
                    return <span className="bg-yellow-400/20 text-yellow-500">Ad Copy</span>;
                case 'aiLogoGenerator': 
                    return <span className="bg-green-400/20 text-green-400">Logo</span>;
                case 'resumeRepair':
                    return <span className="bg-indigo-400/20 text-indigo-400">Resume</span>;
                case 'emailSurgeon':
                    return <span className="bg-rose-400/20 text-rose-400">Email</span>;
                case 'contractClarifier': // NEW
                    return <span className="bg-emerald-400/20 text-emerald-400">Contract</span>;
                case 'storySmith':
                default:
                    return <span className="bg-purple-400/20 text-purple-400">Story</span>;
            }
        };

        return (
            <div className="flex flex-col lg:flex-row h-full overflow-hidden font-ui">
                {/* History List (Left Panel) */}
                <div className="lg:w-1/3 w-full p-6 bg-gray-100 dark:bg-obsidian-black/50 border-r border-silver-mist/30 dark:border-deep-teal-byte/30 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 border-b border-silver-mist/30 dark:border-deep-teal-byte/30 pb-4">
                        <h2 className="text-3xl font-bold text-deep-teal-byte dark:text-silver-mist flex items-center">
                            <History className="w-6 h-6 mr-2"/> Project History
                        </h2>
                        <button
                            onClick={() => setCurrentView('template')}
                            className="text-sm text-deep-teal-byte hover:text-aqua-pulse dark:text-aqua-pulse dark:hover:text-aqua-pulse/80 flex items-center"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1"/> Back to Editor
                        </button>
                    </div>

                    <ul className="space-y-3">
                        {projects.map(project => (
                            <li key={project.id}>
                                <div 
                                    onClick={() => { setSelectedProject(project); setCurrentView('detail'); }}
                                    className="bg-white dark:bg-obsidian-black/80 p-4 rounded-lg shadow-md border border-silver-mist/30 dark:border-deep-teal-byte/50 cursor-pointer hover:shadow-lg dark:hover:bg-deep-teal-byte/20 transition duration-200"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-lg font-semibold text-deep-teal-byte dark:text-silver-mist truncate">{project.title}</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full">
                                            {getTemplateBadge(project.template)}
                                        </span>
                                    </div>
                                    <p className="font-body text-xs text-aqua-pulse mt-1">
                                        {project.timestamp}
                                    </p>
                                    {project.template === 'aiLogoGenerator' ? (
                                        <img src={project.generatedText} alt="Logo preview" className="mt-2 rounded-md h-16 w-16 object-cover" />
                                    ) : (
                                        <p className="font-body text-sm text-deep-teal-byte/70 dark:text-silver-mist/70 mt-2 line-clamp-2">
                                            {project.generatedText.substring(0, 100)}...
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Default Placeholder (Right Panel) */}
                <div className="lg:w-2/3 w-full p-6 overflow-y-auto bg-white dark:bg-obsidian-black hidden lg:block">
                    <div className="text-center py-20 text-deep-teal-byte/70 dark:text-silver-mist/70">
                        <History className="w-12 h-12 mx-auto mb-4 text-silver-mist/50"/>
                        <p className="text-lg">Select a project on the left to view its details.</p>
                    </div>
                </div>
            </div>
        )
    }, [projects, setSelectedProject, setCurrentView]);


    /**
     * UPDATED: View for displaying a single project's details.
     * Now renders inputs dynamically based on `project.template`.
     */
    const DetailView = useMemo(() => {

        // Helper to render the correct inputs based on template
        const renderProjectInputs = (project) => {
            if (!project.inputData) return <p className="font-body text-sm text-deep-teal-byte/90 dark:text-silver-mist/90">No input data saved.</p>;

            const DetailRow = ({ label, value }) => (
                <p className="font-body text-sm text-deep-teal-byte/90 dark:text-silver-mist/90 mt-1">
                    <strong className="text-deep-teal-byte dark:text-silver-mist">{label}:</strong> {value || 'None specified.'}
                </p>
            );

            switch (project.template) {
                case 'lifeLetter': 
                    return (
                        <>
                            <DetailRow label="Type" value={project.inputData.letterType} />
                            <DetailRow label="Recipient" value={project.inputData.recipient} />
                            <DetailRow label="Core Message" value={project.inputData.coreMessage} />
                            <DetailRow label="Tone" value={project.inputData.tone} />
                        </>
                    );
                case 'promptArchitect':
                    return (
                        <>
                            <DetailRow label="Subject" value={project.inputData.subject} />
                            <DetailRow label="Goal" value={project.inputData.goal} />
                            <DetailRow label="Persona" value={project.inputData.persona} />
                            <DetailRow label="Constraints" value={project.inputData.constraints} />
                        </>
                    );
                case 'brandVoice':
                    return (
                        <>
                            <DetailRow label="Brand Name" value={project.inputData.brandName} />
                            <DetailRow label="Product/Service" value={project.inputData.productService} />
                            <DetailRow label="Audience" value={project.inputData.audience} />
                            <DetailRow label="Key Values" value={project.inputData.keyValues} />
                            <DetailRow label="Output Type" value={project.inputData.outputType} />
                        </>
                    );
                case 'homeworkHelper':
                    return (
                        <>
                            <DetailRow label="Subject" value={project.inputData.subject} />
                            <DetailRow label="Question" value={project.inputData.question} />
                            <DetailRow label="Help Type" value={project.inputData.helpType} />
                        </>
                    );
                case 'smallBusiness': 
                    return (
                        <>
                            <DetailRow label="Document Type" value={project.inputData.documentType} />
                            <DetailRow label="Business Name" value={project.inputData.businessName} />
                            <DetailRow label="Key Details" value={project.inputData.keyDetails} />
                        </>
                    );
                case 'digitalProduct':
                    return (
                        <>
                            <DetailRow label="Product Type" value={project.inputData.productType} />
                            <DetailRow label="Topic" value={project.inputData.topic} />
                            <DetailRow label="Audience" value={project.inputData.audience} />
                            <DetailRow label="Key Takeaways" value={project.inputData.keyTakeaways} />
                        </>
                    );
                case 'marketNeeds':
                    return (
                        <>
                            <DetailRow label="Market / Niche" value={project.inputData.marketNiche} />
                            <DetailRow label="Target Audience" value={project.inputData.targetAudience} />
                        </>
                    );
                case 'codeSidekick': 
                    return (
                        <>
                            <DetailRow label="Language" value={project.inputData.language} />
                            <DetailRow label="Goal" value={project.inputData.goal} />
                            <DetailRow label="Requirements" value={project.inputData.requirements} />
                        </>
                    );
                case 'legacyKeeper': 
                    return (
                        <>
                            <DetailRow label="Fragments" value={`${project.inputData.fragments.substring(0, 150)}...`} />
                        </>
                    );
                case 'captionWitch': 
                    return (
                        <>
                            <DetailRow label="Platform" value={project.inputData.platform} />
                            <DetailRow label="Topic" value={project.inputData.topic} />
                            <DetailRow label="Flavor" value={project.inputData.flavor} />
                        </>
                    );
                case 'adCopyAlchemist': 
                    return (
                        <>
                            <DetailRow label="Ad Format" value={project.inputData.adType} />
                            <DetailRow label="Product" value={project.inputData.productName} />
                            <DetailRow label="Audience" value={project.inputData.targetAudience} />
                            <DetailRow label="Key Benefit" value={project.inputData.keyBenefit} />
                        </>
                    );
                case 'aiLogoGenerator': 
                    return (
                        <>
                            <DetailRow label="Company Name" value={project.inputData.companyName} />
                            <DetailRow label="Style" value={project.inputData.style} />
                            <DetailRow label="Colors" value={project.inputData.colors} />
                        </>
                    );
                case 'resumeRepair': // NEW
                    return (
                        <>
                            <DetailRow label="Target Job" value={project.inputData.targetJob} />
                            <DetailRow label="Industry" value={project.inputData.industry} />
                        </>
                    );
                case 'emailSurgeon': // NEW
                    return (
                        <>
                            <DetailRow label="Recipient" value={project.inputData.recipient} />
                            <DetailRow label="Goal" value={project.inputData.goal} />
                            <DetailRow label="Tone" value={project.inputData.tone} />
                        </>
                    );
                case 'contractClarifier': // NEW
                    return (
                        <>
                            <DetailRow label="Type" value={project.inputData.contractType} />
                            <DetailRow label="Text" value={`${project.inputData.contractText.substring(0, 50)}...`} />
                        </>
                    );
                case 'storySmith':
                default:
                    return (
                        <>
                            <DetailRow label="Premise" value={project.inputData.premise} />
                            <DetailRow label="Mood" value={project.inputData.mood} />
                            <DetailRow label="Details" value={project.inputData.details} />
                        </>
                    );
            }
        };

        const getTemplateBadge = (template) => {
             switch (template) {
                case 'lifeLetter': 
                    return <span className="bg-aqua-pulse/20 text-aqua-pulse">Life Letter</span>;
                case 'promptArchitect':
                    return <span className="bg-neural-violet/20 text-neural-violet">Prompt Architect</span>;
                case 'brandVoice':
                    return <span className="bg-cyber-blush/20 text-cyber-blush">Brand Voice</span>;
                case 'homeworkHelper':
                    return <span className="bg-red-400/20 text-red-400">Homework Helper</span>;
                case 'smallBusiness': 
                    return <span className="bg-cyan-400/20 text-cyan-400">Business Assistant</span>;
                case 'digitalProduct':
                    return <span className="bg-orange-400/20 text-orange-400">Digital Product</span>;
                case 'marketNeeds':
                    return <span className="bg-teal-400/20 text-teal-400">Market Needs</span>;
                case 'codeSidekick': 
                    return <span className="bg-blue-400/20 text-blue-400">Code Sidekick</span>;
                case 'legacyKeeper': 
                    return <span className="bg-pink-400/20 text-pink-400">Legacy Keeper</span>;
                case 'captionWitch': 
                    return <span className="bg-purple-400/20 text-purple-400">Caption Witch</span>;
                case 'adCopyAlchemist': 
                    return <span className="bg-yellow-400/20 text-yellow-500">Ad Copy Alchemist</span>;
                case 'aiLogoGenerator': 
                    return <span className="bg-green-400/20 text-green-400">Logo</span>;
                case 'resumeRepair':
                    return <span className="bg-indigo-400/20 text-indigo-400">Resume</span>;
                case 'emailSurgeon':
                    return <span className="bg-rose-400/20 text-rose-400">Email</span>;
                case 'contractClarifier': // NEW
                    return <span className="bg-emerald-400/20 text-emerald-400">Contract</span>;
                case 'storySmith':
                default:
                    return <span className="bg-purple-400/20 text-purple-400">Story</span>;
            }
        };
        
        return (
            <div className="flex flex-col lg:flex-row h-full overflow-hidden font-ui">
                {/* Project List (Left Panel) */}
                <div className="lg:w-1/3 w-full p-6 bg-gray-100 dark:bg-obsidian-black/50 border-r border-silver-mist/30 dark:border-deep-teal-byte/30 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 border-b border-silver-mist/30 dark:border-deep-teal-byte/30 pb-4">
                        <h2 className="text-3xl font-bold text-deep-teal-byte dark:text-silver-mist flex items-center">
                            <History className="w-6 h-6 mr-2"/> Project History
                        </h2>
                        <button
                            onClick={() => setCurrentView('template')}
                            className="text-sm text-deep-teal-byte hover:text-aqua-pulse dark:text-aqua-pulse dark:hover:text-aqua-pulse/80 flex items-center"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1"/> Back to Editor
                        </button>
                    </div>

                    <ul className="space-y-3">
                        {projects.map(project => (
                            <li key={project.id}>
                                <div 
                                    onClick={() => { setSelectedProject(project); setCurrentView('detail'); }}
                                    className="bg-white dark:bg-obsidian-black/80 p-4 rounded-lg shadow-md border border-silver-mist/30 dark:border-deep-teal-byte/50 cursor-pointer hover:shadow-lg dark:hover:bg-deep-teal-byte/20 transition duration-200"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-lg font-semibold text-deep-teal-byte dark:text-silver-mist truncate">{project.title}</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full">
                                            {getTemplateBadge(project.template)}
                                        </span>
                                    </div>
                                    <p className="font-body text-xs text-aqua-pulse mt-1">
                                        {project.timestamp}
                                    </p>
                                    {project.template === 'aiLogoGenerator' ? (
                                        <img src={project.generatedText} alt="Logo preview" className="mt-2 rounded-md h-16 w-16 object-cover" />
                                    ) : (
                                        <p className="font-body text-sm text-deep-teal-byte/70 dark:text-silver-mist/70 mt-2 line-clamp-2">
                                            {project.generatedText.substring(0, 100)}...
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Detail Content (Right Panel) */}
                <div className="lg:w-2/3 w-full p-6 overflow-y-auto bg-white dark:bg-obsidian-black">
                    {selectedProject ? (
                        <>
                            <div className="flex justify-between items-start mb-2">
                                <h1 className="text-4xl font-extrabold text-deep-teal-byte dark:text-silver-mist">{selectedProject.title}</h1>
                                <span className="flex-shrink-0 ml-4 text-sm font-semibold px-3 py-1 rounded-full">
                                    {getTemplateBadge(selectedProject.template)}
                                </span>
                            </div>

                            <p className="font-body text-sm text-deep-teal-byte/70 dark:text-silver-mist/70 mb-6 border-b border-silver-mist/30 dark:border-deep-teal-byte/30 pb-4">
                                Generated: {selectedProject.timestamp}
                            </p>

                            <div className="bg-gray-100 dark:bg-obsidian-black/80 p-4 rounded-lg mb-6 border border-silver-mist/30 dark:border-deep-teal-byte/50">
                                <h3 className="text-lg font-semibold text-deep-teal-byte dark:text-silver-mist mb-2">Original Inputs</h3>
                                {renderProjectInputs(selectedProject)}
                            </div>
                            
                            <div className="flex justify-end space-x-2 mb-3">
                                <button
                                    onClick={handleCopy}
                                    disabled={selectedProject.template === 'aiLogoGenerator'} 
                                    className="text-deep-teal-byte/70 dark:text-silver-mist/70 hover:text-aqua-pulse dark:hover:text-aqua-pulse p-2 rounded-full hover:bg-deep-teal-byte/10 dark:hover:bg-deep-teal-byte/40 transition relative"
                                    title="Copy Content"
                                >
                                    <Copy className="w-5 h-5" />
                                    {copyStatus && (
                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-obsidian-black text-white text-xs rounded-lg whitespace-nowrap">
                                            {copyStatus}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* NEW: Conditional Output for Image vs Text */}
                            {selectedProject.template === 'aiLogoGenerator' ? (
                                <div className="flex justify-center items-center mt-4">
                                    <img src={selectedProject.generatedText} alt={selectedProject.title} className="max-w-full h-auto rounded-lg shadow-lg" />
                                </div>
                            ) : (
                                <div className={`prose dark:prose-invert max-w-none 
                                                prose-p:font-body prose-headings:font-ui prose-headings:text-deep-teal-byte dark:prose-headings:text-silver-mist
                                                prose-p:text-obsidian-black/80 dark:prose-p:text-silver-mist/90
                                                prose-strong:text-deep-teal-byte dark:prose-strong:text-silver-mist
                                                prose-code:text-cyber-blush prose-code:bg-silver-mist/50 dark:prose-code:bg-deep-teal-byte/30
                                                prose-blockquote:border-aqua-pulse prose-blockquote:text-deep-teal-byte/80 dark:prose-blockquote:text-silver-mist/80
                                                ${(selectedProject.template === 'promptArchitect' || selectedProject.template === 'smallBusiness' || selectedProject.template === 'codeSidekick' || selectedProject.template === 'adCopyAlchemist' || selectedProject.template === 'resumeRepair' || selectedProject.template === 'contractClarifier') ? 'font-mono text-sm' : 'font-body'}
                                                leading-relaxed mt-4`}>
                                    {selectedProject.generatedText.split('\n').map((line, index) => (
                                        <p key={index} className="mb-4">{line}</p>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 text-deep-teal-byte/70 dark:text-silver-mist/70">
                            <History className="w-12 h-12 mx-auto mb-4 text-silver-mist/50"/>
                            <p className="text-lg">Select a project to view its full details.</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }, [projects, selectedProject, handleCopy, copyStatus]);


    // ---------------------------------------------------
    // V. MAIN RENDER
    // ---------------------------------------------------
    
    const renderView = () => {
        switch (currentView) {
            case 'history':
                return HistoryView;
            case 'detail':
                return DetailView;
            case 'template':
            default:
                return TemplateView;
        }
    };

    return (
        <>
            <StyleInjector />
            <div className={`min-h-screen bg-white dark:bg-obsidian-black font-ui flex flex-col`}>
                {/* Header */}
                <header className="bg-white/80 dark:bg-obsidian-black/70 backdrop-blur-sm shadow-md p-4 flex justify-between items-center border-b border-silver-mist/30 dark:border-deep-teal-byte/30">
                    <div className="flex flex-col">
                        <h1 className="font-logo text-2xl font-extrabold text-deep-teal-byte dark:text-silver-mist leading-none uppercase">
                            <span className="text-aqua-pulse">ReFURRMed</span> Ink
                        </h1>
                        <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 font-medium italic mt-1 leading-none">
                            Ink with a pulse!
                        </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <span className="font-body text-sm text-deep-teal-byte/70 dark:text-silver-mist/70 hidden sm:inline">
                            User ID: {userId || "Loading..."}
                        </span>
                        
                        {userProfile?.subscriptionStatus === 'pro' ? (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-aqua-pulse/20 text-aqua-pulse uppercase">
                                Pro Member
                            </span>
                        ) : userProfile?.subscriptionStatus === 'executive' ? ( 
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-neural-violet/20 text-neural-violet uppercase">
                                Executive
                            </span>
                        ) : (
                            <button
                                onClick={() => setShowPricingModal(true)}
                                className="px-4 py-1 text-xs font-bold rounded-full bg-neural-violet text-white hover:bg-neural-violet/80 transition shadow-md uppercase flex items-center whitespace-nowrap"
                                title="Unlock unlimited generations"
                            >
                                <User className="w-4 h-4 mr-1"/> Upgrade to Pro
                            </button>
                        )}

                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-full bg-silver-mist/50 dark:bg-deep-teal-byte/40 text-deep-teal-byte dark:text-aqua-pulse hover:bg-silver-mist dark:hover:bg-deep-teal-byte/60 transition"
                            title={isDarkMode ? 'Enable Light Mode' : 'Enable Dark Mode'}
                        >
                            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={() => setCurrentView(currentView === 'template' ? 'history' : 'template')}
                            className="p-2 rounded-full bg-silver-mist/50 dark:bg-deep-teal-byte/40 text-deep-teal-byte dark:text-aqua-pulse hover:bg-silver-mist dark:hover:bg-deep-teal-byte/60 transition"
                            title={currentView === 'template' ? 'View History' : 'Go to Editor'}
                        >
                            {currentView === 'template' ? <History className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                        </button>
                    </div>
                </header>

                <main className="flex-grow h-[calc(100vh-80px)]"> 
                    {isAuthReady ? renderView() : (
                        <div className="flex items-center justify-center h-full text-lg text-deep-teal-byte/80 dark:text-silver-mist/80">
                            <Loader className="w-8 h-8 mr-3 animate-spin text-aqua-pulse" />
                            Initializing Application...
                        </div>
                    )}
                </main>
                
                {/* Modals */}
                {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}
                {showPricingModal && (
                    <PricingModal 
                        onClose={() => setShowPricingModal(false)}
                        onSubscribe={handleSubscriptionClick}
                    />
                )}
            </div>
        </>
    );
};

export default App;

