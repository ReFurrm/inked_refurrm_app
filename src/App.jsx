import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, serverTimestamp, getDocs, updateDoc } from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore';
// REVERTED: Back to standard named imports for stability
import { 
    Send, History, Loader, Save, BookOpen, Copy, X, CheckCircle, 
    Sun, Moon, Feather, Mail, Lightbulb, Sparkles, GraduationCap, Briefcase, BookCopy, 
    Search, ChevronDown, Code, Heart, Wand2, Megaphone, ImageIcon, FileText, Scale, 
    PenTool, Globe, Zap 
} from 'lucide-react';

// Set Firebase log level for debugging
setLogLevel('debug');

// --- Global Variables (Provided by Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The AI Model and API endpoint
const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';
const TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;
const IMAGE_MODEL = 'imagen-4.0-generate-001';
const IMAGE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:predict?key=`;
const API_KEY = ""; 

// --- Style & Font Injector ---
const StyleInjector = () => {
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Orbitron:wght@700&family=Poppins:wght@500;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    // Only inject if not present
    if (!document.getElementById('tailwind-script')) {
        const tailwindScript = document.createElement('script');
        tailwindScript.id = 'tailwind-script';
        tailwindScript.src = "https://cdn.tailwindcss.com";
        tailwindScript.onload = () => {
             if (!document.getElementById('tailwind-config')) {
                 const configScript = document.createElement('script');
                 configScript.id = 'tailwind-config';
                 configScript.innerHTML = `
                    tailwind.config = {
                      darkMode: 'class',
                      theme: {
                        extend: {
                          colors: {
                            'silver-mist': '#C8D1D9', 
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
             }
        };
        document.head.appendChild(tailwindScript);
    }

    if (!document.getElementById('base-font-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'base-font-styles';
        styleTag.innerHTML = `
          body { font-family: 'Poppins', sans-serif; }
          .font-body { font-family: 'Inter', sans-serif; }
          .font-logo { font-family: 'Orbitron', sans-serif; }
        `;
        document.head.appendChild(styleTag);
    }
  }, []); 
  return null; 
};

// --- System Prompts ---
const COMMON_RULES = `HARD RULES: 1. Never use em-dashes (—). Use standard hyphens (-) only for compound words (like "full-time") or phone numbers, otherwise use commas or parentheses. 2. Always write in complete, grammatically correct sentences.`;

const STORY_SYSTEM_PROMPT = `Act as an award-winning literary fiction author with a focus on immersive sensory detail. ${COMMON_RULES}`;
const LIFE_LETTER_SYSTEM_PROMPT = `Act as an exceptionally empathetic ghostwriter for difficult, personal messages. ${COMMON_RULES}`;
const PROMPT_ARCHITECT_SYSTEM_PROMPT = `Act as a 'Prompt Architect' expert in AI engineering. ${COMMON_RULES}`;
const BRAND_VOICE_SYSTEM_PROMPT = `Act as a world-class brand strategist and storyteller. ${COMMON_RULES}`;
const HOMEWORK_HELPER_SYSTEM_PROMPT = `Act as a helpful and encouraging tutor. Explain concepts clearly. ${COMMON_RULES}`;
const BUSINESS_ASSISTANT_SYSTEM_PROMPT = `Act as an expert Small Business Consultant generating professional documents. ${COMMON_RULES}`;
const DIGITAL_PRODUCT_SYSTEM_PROMPT = `Act as an expert ghostwriter and instructional designer for long-form content. ${COMMON_RULES}`;
const MARKET_NEEDS_SYSTEM_PROMPT = `Act as a senior market analyst uncovering unfulfilled needs. ${COMMON_RULES}`;
const CODE_SIDEKICK_SYSTEM_PROMPT = `Act as an expert 10x developer. Provide clean, commented code in markdown. ${COMMON_RULES}`;
const LEGACY_KEEPER_SYSTEM_PROMPT = `Act as a gentle editor organizing messy notes into a clean narrative. ${COMMON_RULES}`;
const CAPTION_WITCH_SYSTEM_PROMPT = `Act as a witty social media expert creating engaging captions with hashtags. ${COMMON_RULES}`;
const AD_COPY_ALCHEMIST_SYSTEM_PROMPT = `Act as a world-class copywriter creating high-converting ads. ${COMMON_RULES}`;
const RESUME_REPAIR_SYSTEM_PROMPT = `Act as an expert career coach transforming resumes into achievement-oriented documents. ${COMMON_RULES}`;
const EMAIL_SURGEON_SYSTEM_PROMPT = `Act as an expert communications strategist fixing email drafts for tone and clarity. ${COMMON_RULES}`;
const CONTRACT_CLARIFIER_SYSTEM_PROMPT = `Act as an expert legal analyst breaking down contracts into plain English. Include red flags and action items. ${COMMON_RULES}`;
const CO_WRITER_SYSTEM_PROMPT = `You are a collaborative novelist. You co-author full-length fiction with human writers. ${COMMON_RULES}`;
const UNIVERSAL_TRANSLATOR_SYSTEM_PROMPT = `Act as an expert translator and localization specialist. Translate the text into the target language while perfectly preserving tone and formatting. ${COMMON_RULES}`;
const UNIVERSAL_INK_SYSTEM_PROMPT = `You are ReFURRMed Ink, a versatile, intelligent, and creative AI assistant. You can handle any writing, analysis, or creative task. ${COMMON_RULES}`;

// --- Initial States ---
const initialStoryFormState = { premise: '', mood: 'Melancholy', details: '' };
const initialLetterFormState = { letterType: 'Setting a Boundary', recipient: '', coreMessage: '', tone: 'Firm but kind' };
const initialPromptArchitectFormState = { subject: '', goal: '', persona: '', constraints: '' };
const initialBrandVoiceFormState = { brandName: '', productService: '', audience: '', keyValues: '', outputType: 'Mission Statement' };
const initialHomeworkHelperFormState = { subject: '', question: '', helpType: 'Explain this concept' };
const initialBusinessAssistantFormState = { documentType: 'Business Plan Section', businessName: '', keyDetails: '' };
const initialDigitalProductFormState = { productType: 'Ebook (Outline + Chapter 1)', topic: '', audience: '', keyTakeaways: '' };
const initialMarketNeedsFormState = { marketNiche: '', targetAudience: '' };
const initialCodeSidekickFormState = { language: 'JavaScript', goal: '', requirements: '' };
const initialLegacyKeeperFormState = { fragments: '' };
const initialCaptionWitchFormState = { platform: 'Instagram', topic: '', flavor: 'Witty' };
const initialAdCopyAlchemistFormState = { productName: '', targetAudience: '', keyBenefit: '', adType: 'Facebook/IG Ad' };
const initialAiLogoGeneratorFormState = { companyName: '', style: 'Minimalist', colors: '' };
const initialResumeRepairFormState = { currentResume: '', targetJob: '', industry: '' };
const initialEmailSurgeonFormState = { draftEmail: '', recipient: '', goal: '', tone: 'Professional' };
const initialContractClarifierFormState = { contractType: 'Freelance Agreement', contractText: '' };
const initialCoWriterFormState = { projectStage: 'Brainstorming', currentFocus: '', userInput: '' }; 
const initialUniversalTranslatorFormState = { textToTranslate: '', targetLanguage: 'Spanish' }; 
const initialUniversalInkFormState = { request: '' }; 

// --- Options ---
const MOOD_OPTIONS = ['Suspenseful', 'Melancholy', 'Witty', 'Nostalgic', 'Intense', 'Whimsical', 'Somber', 'Hopeful'];
const LETTER_TYPE_OPTIONS = ['Setting a Boundary', 'Apology', 'Confession', 'Thank You Note', 'Goodbye Letter', 'Love Letter', 'Request for Help', 'Resignation', 'Breakup'];
const TONE_OPTIONS = ['Firm but kind', 'Deeply regretful', 'Heartfelt and loving', 'Formal and respectful', 'Vulnerable and honest', 'Direct and serious'];
const BRAND_OUTPUT_TYPE_OPTIONS = ['Mission Statement', 'Origin Story', 'About Page'];
const HELP_TYPE_OPTIONS = ['Explain this concept', 'Solve this problem (with steps)', 'Check my answer'];
const BUSINESS_DOC_TYPE_OPTIONS = ['Business Plan Section', 'Investor Pitch Slide', 'Start-up Cost Planner', 'Invoice', 'Proposal', 'Receipt', 'Letterhead (HTML/CSS)'];
const DIGITAL_PRODUCT_TYPE_OPTIONS = ['Ebook (Outline + Chapter 1)', 'Online Course (Outline + Lesson 1 Script)', 'Webinar Script (Intro + First 10 Mins)'];
const LANGUAGE_OPTIONS = ['JavaScript', 'Python', 'HTML/CSS', 'React', 'SQL', 'Java', 'C++', 'Go', 'PHP', 'Ruby', 'General'];
const PLATFORM_OPTIONS = ['Instagram', 'Facebook', 'X (Twitter)', 'LinkedIn', 'TikTok'];
const FLAVOR_OPTIONS = ['Witty / Funny', 'Poetic / Deep', 'Spicy / Edgy', 'Vulnerable / Honest', 'Inspiring / Motivational', 'Professional / Polished'];
const AD_TYPE_OPTIONS = ['Facebook/IG Ad', 'Google Ad Headline', 'Google Ad Description', 'Taglines/Hooks'];
const LOGO_STYLE_OPTIONS = ['Minimalist', 'Geometric', 'Vintage', 'Abstract', 'Lettermark', 'Modern', 'Futuristic', 'Playful'];
const EMAIL_TONE_OPTIONS = ['Professional', 'Direct & Urgent', 'Friendly & Warm', 'Apologetic', 'Persuasive', 'Firm Boundary'];
const CONTRACT_TYPE_OPTIONS = ['Freelance Agreement', 'Lease/Rental Agreement', 'Terms of Service', 'NDA (Non-Disclosure)', 'Employment Contract', 'General Contract'];
const PROJECT_STAGE_OPTIONS = ['Brainstorming', 'Plotting/Outlining', 'Drafting', 'Revising', 'Polishing']; 
const TARGET_LANGUAGES = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese (Mandarin)', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Hindi'];
const SUBSCRIPTION_PLANS = [
    { id: 'monthly', name: 'Pro Monthly', price: '$29/mo', interval: 'mo', tag: 'Best for new users', features: ['Unlimited text generation', 'Logo generation included', 'History and save to projects'] },
    { id: 'annual', name: 'Pro Annual', price: '$290/yr', interval: 'yr', tag: 'Two months free', features: ['Everything in Pro Monthly', 'Priority generation queue', 'Early access to new templates'], highlight: true },
    { id: 'executive', name: 'Executive', price: '$79/mo', interval: 'mo', tag: 'For power users', features: ['Team seats (up to 3)', 'Dedicated onboarding support', 'White-label exports'] }
];

// --- Utility Functions ---
const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch (err) { console.error(err); }
    document.body.removeChild(el);
    return true; 
};

const CustomAlert = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-obsidian-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-obsidian-black p-6 rounded-xl shadow-2xl max-w-sm w-full border border-silver-mist/30 transform transition-all">
            <h3 className="font-ui text-xl font-bold text-cyber-blush mb-3">Notice</h3>
            <p className="font-body text-deep-teal-byte/90 dark:text-silver-mist/90 mb-5" dangerouslySetInnerHTML={{ __html: message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            <button onClick={onClose} className="w-full bg-aqua-pulse text-obsidian-black py-2 rounded-lg font-semibold hover:bg-aqua-pulse/80 transition">Close</button>
        </div>
    </div>
);

const PricingModal = ({ onClose, onSubscribe }) => (
    <div className="fixed inset-0 bg-obsidian-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-obsidian-black/90 dark:backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-4xl w-full transform transition-all relative border border-silver-mist/20">
            <button onClick={onClose} className="absolute top-4 right-4 text-silver-mist/70 hover:text-silver-mist p-2 rounded-full transition"><X className="w-6 h-6" /></button>
            <h2 className="font-ui text-3xl font-bold text-deep-teal-byte dark:text-aqua-pulse text-center mb-2">Unlock Your Full Potential</h2>
            <p className="font-body text-deep-teal-byte/80 dark:text-silver-mist/80 text-center mb-8">Choose the plan that's right for your journey.</p>
            <div className="grid md:grid-cols-3 gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => (
                    <div key={plan.id} className={`p-6 rounded-xl shadow-lg border-2 flex flex-col transition-all duration-300 ${plan.highlight ? 'border-aqua-pulse bg-deep-teal-byte/5 dark:bg-deep-teal-byte/20 transform scale-105' : 'border-silver-mist/20 bg-white dark:bg-obsidian-black hover:shadow-xl'}`}>
                        {plan.highlight && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-aqua-pulse text-obsidian-black text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">Recommended</div>}
                        <h3 className="font-ui text-2xl font-bold text-deep-teal-byte dark:text-silver-mist mb-1">{plan.name}</h3>
                        <p className={`font-ui text-sm font-semibold mb-4 ${plan.highlight ? 'text-aqua-pulse' : 'text-deep-teal-byte/70 dark:text-silver-mist/70'}`}>{plan.tag}</p>
                        <div className="flex items-end mb-6"><span className="font-logo text-5xl font-extrabold text-deep-teal-byte dark:text-silver-mist">{plan.price.split('/')[0]}</span><span className="font-ui text-xl font-medium text-deep-teal-byte/70 dark:text-silver-mist/70 ml-1">/{plan.interval}</span></div>
                        <ul className="space-y-3 flex-grow mb-8 font-body">{plan.features.map((feature, index) => (<li key={index} className="flex items-start text-deep-teal-byte/90 dark:text-silver-mist/90"><CheckCircle className="w-5 h-5 text-aqua-pulse mr-2 flex-shrink-0" /><span className="text-sm">{feature}</span></li>))}</ul>
                        <button onClick={() => onSubscribe(plan)} className={`w-full py-3 rounded-lg font-bold transition-colors shadow-md font-ui ${plan.highlight ? 'bg-aqua-pulse text-obsidian-black hover:bg-aqua-pulse/80' : 'bg-deep-teal-byte text-silver-mist hover:bg-deep-teal-byte/80 dark:bg-silver-mist dark:text-obsidian-black dark:hover:bg-silver-mist/80'}`}>{plan.id === 'annual' ? 'Save and Subscribe' : 'Choose Plan'}</button>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- Forms ---
const inputClass = "font-body w-full border-silver-mist/50 bg-white text-deep-teal-byte dark:border-deep-teal-byte dark:bg-obsidian-black dark:text-white rounded-lg shadow-sm focus:ring-aqua-pulse focus:border-aqua-pulse p-3 text-sm";
const labelClass = "block text-sm font-semibold text-deep-teal-byte dark:text-silver-mist/90 mb-1";
const btnClass = "w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium transition-colors bg-aqua-pulse text-obsidian-black font-semibold hover:bg-aqua-pulse/80 disabled:opacity-50 disabled:cursor-not-allowed";

const StorySmithForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Core Premise</label><textarea name="premise" rows="4" value={formState.premise} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Mood</label><select name="mood" value={formState.mood} onChange={onChange} className={inputClass}>{MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        <div><label className={labelClass}>Details</label><textarea name="details" rows="3" value={formState.details} onChange={onChange} className={inputClass} /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />} Generate Story</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const LifeLetterForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Type</label><select name="letterType" value={formState.letterType} onChange={onChange} className={inputClass}>{LETTER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Recipient</label><input name="recipient" value={formState.recipient} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Core Message</label><textarea name="coreMessage" rows="5" value={formState.coreMessage} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Tone</label><select name="tone" value={formState.tone} onChange={onChange} className={inputClass}>{TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />} Generate Letter</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const PromptArchitectForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Subject</label><input name="subject" value={formState.subject} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Goal</label><input name="goal" value={formState.goal} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Persona</label><input name="persona" value={formState.persona} onChange={onChange} className={inputClass} /></div>
        <div><label className={labelClass}>Constraints</label><textarea name="constraints" rows="3" value={formState.constraints} onChange={onChange} className={inputClass} /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Lightbulb className="w-5 h-5 mr-2" />} Generate Prompt</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const BrandVoiceForm = React.memo(({ formState, onChange, onBlur, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Brand Name</label><input name="brandName" value={formState.brandName} onChange={onChange} onBlur={onBlur} className={inputClass} required /></div>
        <div><label className={labelClass}>Product/Service</label><input name="productService" value={formState.productService} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Audience</label><input name="audience" value={formState.audience} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Key Values</label><input name="keyValues" value={formState.keyValues} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Output</label><select name="outputType" value={formState.outputType} onChange={onChange} className={inputClass}>{BRAND_OUTPUT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />} Generate Copy</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const HomeworkHelperForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Subject</label><input name="subject" value={formState.subject} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Question</label><textarea name="question" rows="5" value={formState.question} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Help Type</label><select name="helpType" value={formState.helpType} onChange={onChange} className={inputClass}>{HELP_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <GraduationCap className="w-5 h-5 mr-2" />} Get Help</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const BusinessAssistantForm = React.memo(({ formState, onChange, onBlur, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Doc Type</label><select name="documentType" value={formState.documentType} onChange={onChange} className={inputClass}>{BUSINESS_DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Business Name</label><input name="businessName" value={formState.businessName} onChange={onChange} onBlur={onBlur} className={inputClass} required /></div>
        <div><label className={labelClass}>Details</label><textarea name="keyDetails" rows="6" value={formState.keyDetails} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Briefcase className="w-5 h-5 mr-2" />} Generate Doc</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const DigitalProductForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Product Type</label><select name="productType" value={formState.productType} onChange={onChange} className={inputClass}>{DIGITAL_PRODUCT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Topic</label><input name="topic" value={formState.topic} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Audience</label><input name="audience" value={formState.audience} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Key Takeaways</label><textarea name="keyTakeaways" rows="3" value={formState.keyTakeaways} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <BookCopy className="w-5 h-5 mr-2" />} Create Content</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const MarketNeedsForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Niche</label><input name="marketNiche" value={formState.marketNiche} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Audience</label><input name="targetAudience" value={formState.targetAudience} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />} Analyze Market</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const CodeSidekickForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Language</label><select name="language" value={formState.language} onChange={onChange} className={inputClass}>{LANGUAGE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Goal</label><input name="goal" value={formState.goal} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Reqs</label><textarea name="requirements" rows="4" value={formState.requirements} onChange={onChange} className={inputClass} /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Code className="w-5 h-5 mr-2" />} Generate Code</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const LegacyKeeperForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Notes & Fragments</label><textarea name="fragments" rows="15" value={formState.fragments} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Heart className="w-5 h-5 mr-2" />} Put It Together</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const CaptionWitchForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Platform</label><select name="platform" value={formState.platform} onChange={onChange} className={inputClass}>{PLATFORM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Topic</label><textarea name="topic" rows="4" value={formState.topic} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Flavor</label><select name="flavor" value={formState.flavor} onChange={onChange} className={inputClass}>{FLAVOR_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />} Cast Spell</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const AdCopyAlchemistForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Format</label><select name="adType" value={formState.adType} onChange={onChange} className={inputClass}>{AD_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Product</label><input name="productName" value={formState.productName} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Audience</label><input name="targetAudience" value={formState.targetAudience} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Benefit</label><textarea name="keyBenefit" rows="3" value={formState.keyBenefit} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Megaphone className="w-5 h-5 mr-2" />} Transmute</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const AiLogoGeneratorForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Company</label><input name="companyName" value={formState.companyName} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Style</label><select name="style" value={formState.style} onChange={onChange} className={inputClass}>{LOGO_STYLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Colors</label><input name="colors" value={formState.colors} onChange={onChange} className={inputClass} /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <ImageIcon className="w-5 h-5 mr-2" />} Generate Logo</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const ResumeRepairForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Target Job</label><input name="targetJob" value={formState.targetJob} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Industry</label><input name="industry" value={formState.industry} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Current Resume</label><textarea name="currentResume" rows="8" value={formState.currentResume} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <FileText className="w-5 h-5 mr-2" />} Polish Resume</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const EmailSurgeonForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Recipient</label><input name="recipient" value={formState.recipient} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Goal</label><input name="goal" value={formState.goal} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Draft</label><textarea name="draftEmail" rows="5" value={formState.draftEmail} onChange={onChange} className={inputClass} required /></div>
        <div><label className={labelClass}>Tone</label><select name="tone" value={formState.tone} onChange={onChange} className={inputClass}>{EMAIL_TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />} Fix Email</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const ContractClarifierForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Doc Type</label><select name="contractType" value={formState.contractType} onChange={onChange} className={inputClass}>{CONTRACT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Contract Text</label><textarea name="contractText" rows="10" value={formState.contractText} onChange={onChange} className={inputClass} required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Scale className="w-5 h-5 mr-2" />} Clarify Contract</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const CoWriterForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Project Stage</label><select name="projectStage" value={formState.projectStage} onChange={onChange} className={inputClass}>{PROJECT_STAGE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Current Focus</label><input name="currentFocus" value={formState.currentFocus} onChange={onChange} className={inputClass} placeholder="e.g., Chapter 3, the argument scene in the diner" required /></div>
        <div><label className={labelClass}>Your Input</label><textarea name="userInput" rows="8" value={formState.userInput} onChange={onChange} className={inputClass} placeholder="Paste your draft, ideas, or specific request here..." required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <PenTool className="w-5 h-5 mr-2" />} Collaborate</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const UniversalTranslatorForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>Target Language</label><select name="targetLanguage" value={formState.targetLanguage} onChange={onChange} className={inputClass}>{TARGET_LANGUAGES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className={labelClass}>Text to Translate</label><textarea name="textToTranslate" rows="8" value={formState.textToTranslate} onChange={onChange} className={inputClass} placeholder="Paste text here..." required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Globe className="w-5 h-5 mr-2" />} Translate</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));

const UniversalInkForm = React.memo(({ formState, onChange, onSubmit, isGenerating, error }) => (
    <form onSubmit={onSubmit} className="space-y-6">
        <div><label className={labelClass}>What can I do for you?</label><textarea name="request" rows="10" value={formState.request} onChange={onChange} className={inputClass} placeholder="Ask me anything. I can draft, edit, brainstorm, code, or analyze." required /></div>
        <button type="submit" disabled={isGenerating} className={btnClass}>{isGenerating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />} Create</button>
        {error && <p className="text-cyber-blush text-xs mt-2">{error}</p>}
    </form>
));


// --- Main Application ---
const App = () => {
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [auth, setAuth] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [currentView, setCurrentView] = useState('template'); 
    const [currentTemplate, setCurrentTemplate] = useState('marketNeeds');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [openCategories, setOpenCategories] = useState(['business', 'personal', 'utility']);

    // Form States
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
    const [contractClarifierFormState, setContractClarifierFormState] = useState(initialContractClarifierFormState);
    const [coWriterFormState, setCoWriterFormState] = useState(initialCoWriterFormState); 
    const [universalTranslatorFormState, setUniversalTranslatorFormState] = useState(initialUniversalTranslatorFormState); 
    const [universalInkFormState, setUniversalInkFormState] = useState(initialUniversalInkFormState); 

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const [generatedImage, setGeneratedImage] = useState(''); 
    const [projectTitle, setProjectTitle] = useState('');
    const [error, setError] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const handleSubscriptionClick = (plan) => {
        setShowPricingModal(false);
        setAlertMessage(`You selected the ${plan.name} plan. Billing is handled outside this preview.`);
    };

    useEffect(() => {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) return;
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const firestore = getFirestore(app);
        setAuth(authInstance);
        setDb(firestore);
        onAuthStateChanged(authInstance, async (user) => {
            if (!user) {
                if (initialAuthToken) await signInWithCustomToken(authInstance, initialAuthToken);
                else await signInAnonymously(authInstance);
            }
            setUserId(authInstance.currentUser?.uid || crypto.randomUUID());
            setIsAuthReady(true);
        });
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'user_data', 'profile');
        onSnapshot(userDocRef, (docSnap) => {
            setUserProfile(docSnap.exists() ? docSnap.data() : { subscriptionStatus: 'pro', email: 'anonymous' });
            if (!docSnap.exists()) setDoc(userDocRef, { subscriptionStatus: 'pro', email: 'anonymous', createdAt: serverTimestamp(), businessName: '' }, { merge: true });
        });
    }, [isAuthReady, db, userId]);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'projects'));
        onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate().toLocaleDateString() || 'N/A' }));
            setProjects(loaded.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        });
    }, [isAuthReady, db, userId]);

    useEffect(() => { if (isDarkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [isDarkMode]);
    
    useEffect(() => {
        if (userProfile?.businessName) {
            if (!businessAssistantFormState.businessName) setBusinessAssistantFormState(p => ({ ...p, businessName: userProfile.businessName }));
            if (!brandVoiceFormState.brandName) setBrandVoiceFormState(p => ({ ...p, brandName: userProfile.businessName }));
        }
    }, [currentTemplate, userProfile]);

    // Handlers
    const handleFormChange = (setter) => (e) => setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTemplateChange = (t) => { if (t !== currentTemplate) { setCurrentTemplate(t); setGeneratedText(''); setGeneratedImage(''); setProjectTitle(''); setError(null); } };
    const toggleCategory = (id) => setOpenCategories(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
    const handleBusinessNameBlur = async (e) => {
        if (db && userId && e.target.value.trim()) await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'user_data', 'profile'), { businessName: e.target.value.trim() });
    };

    const generateContent = async (e) => {
        e.preventDefault();
        if (!['pro', 'executive'].includes(userProfile?.subscriptionStatus)) return setAlertMessage("Upgrade to Pro to generate content!");
        
        setIsGenerating(true); setGeneratedText(''); setGeneratedImage(''); setError(null);
        
        let userPrompt = '', systemPrompt = '', apiUrl = TEXT_API_URL, payload = {};
        
        if (currentTemplate === 'aiLogoGenerator') {
            if (!aiLogoGeneratorFormState.companyName) return setIsGenerating(false);
            userPrompt = `Professional logo for '${aiLogoGeneratorFormState.companyName}', style: ${aiLogoGeneratorFormState.style}, colors: ${aiLogoGeneratorFormState.colors}. Minimalist vector.`;
            apiUrl = IMAGE_API_URL;
            payload = { instances: [{ prompt: userPrompt }], parameters: { sampleCount: 1 } };
        } else {
            // Text templates
            if (currentTemplate === 'storySmith') { systemPrompt = STORY_SYSTEM_PROMPT; userPrompt = `Premise: ${storyFormState.premise}, Mood: ${storyFormState.mood}, Details: ${storyFormState.details}`; }
            else if (currentTemplate === 'lifeLetter') { systemPrompt = LIFE_LETTER_SYSTEM_PROMPT; userPrompt = `Type: ${letterFormState.letterType}, Recipient: ${letterFormState.recipient}, Message: ${letterFormState.coreMessage}, Tone: ${letterFormState.tone}`; }
            else if (currentTemplate === 'promptArchitect') { systemPrompt = PROMPT_ARCHITECT_SYSTEM_PROMPT; userPrompt = `Subject: ${promptArchitectFormState.subject}, Goal: ${promptArchitectFormState.goal}, Persona: ${promptArchitectFormState.persona}, Constraints: ${promptArchitectFormState.constraints}`; }
            else if (currentTemplate === 'brandVoice') { systemPrompt = BRAND_VOICE_SYSTEM_PROMPT; userPrompt = `Brand: ${brandVoiceFormState.brandName}, Product: ${brandVoiceFormState.productService}, Audience: ${brandVoiceFormState.audience}, Values: ${brandVoiceFormState.keyValues}, Output: ${brandVoiceFormState.outputType}`; }
            else if (currentTemplate === 'homeworkHelper') { systemPrompt = HOMEWORK_HELPER_SYSTEM_PROMPT; userPrompt = `Subject: ${homeworkHelperFormState.subject}, Question: ${homeworkHelperFormState.question}, Help: ${homeworkHelperFormState.helpType}`; }
            else if (currentTemplate === 'businessAssistant') { systemPrompt = BUSINESS_ASSISTANT_SYSTEM_PROMPT; userPrompt = `Doc: ${businessAssistantFormState.documentType}, Business: ${businessAssistantFormState.businessName}, Details: ${businessAssistantFormState.keyDetails}`; } 
            else if (currentTemplate === 'digitalProduct') { systemPrompt = DIGITAL_PRODUCT_SYSTEM_PROMPT; userPrompt = `Type: ${digitalProductFormState.productType}, Topic: ${digitalProductFormState.topic}, Audience: ${digitalProductFormState.audience}, Takeaways: ${digitalProductFormState.keyTakeaways}`; }
            else if (currentTemplate === 'marketNeeds') { systemPrompt = MARKET_NEEDS_SYSTEM_PROMPT; userPrompt = `Niche: ${marketNeedsFormState.marketNiche}, Audience: ${marketNeedsFormState.targetAudience}`; }
            else if (currentTemplate === 'codeSidekick') { systemPrompt = CODE_SIDEKICK_SYSTEM_PROMPT; userPrompt = `Lang: ${codeSidekickFormState.language}, Goal: ${codeSidekickFormState.goal}, Reqs: ${codeSidekickFormState.requirements}`; }
            else if (currentTemplate === 'legacyKeeper') { systemPrompt = LEGACY_KEEPER_SYSTEM_PROMPT; userPrompt = `Fragments: ${legacyKeeperFormState.fragments}`; }
            else if (currentTemplate === 'captionWitch') { systemPrompt = CAPTION_WITCH_SYSTEM_PROMPT; userPrompt = `Platform: ${captionWitchFormState.platform}, Topic: ${captionWitchFormState.topic}, Flavor: ${captionWitchFormState.flavor}`; }
            else if (currentTemplate === 'adCopyAlchemist') { systemPrompt = AD_COPY_ALCHEMIST_SYSTEM_PROMPT; userPrompt = `Format: ${adCopyAlchemistFormState.adType}, Product: ${adCopyAlchemistFormState.productName}, Audience: ${adCopyAlchemistFormState.targetAudience}, Benefit: ${adCopyAlchemistFormState.keyBenefit}`; }
            else if (currentTemplate === 'resumeRepair') { systemPrompt = RESUME_REPAIR_SYSTEM_PROMPT; userPrompt = `Job: ${resumeRepairFormState.targetJob}, Industry: ${resumeRepairFormState.industry}, Resume: ${resumeRepairFormState.currentResume}`; }
            else if (currentTemplate === 'emailSurgeon') { systemPrompt = EMAIL_SURGEON_SYSTEM_PROMPT; userPrompt = `Recipient: ${emailSurgeonFormState.recipient}, Goal: ${emailSurgeonFormState.goal}, Draft: ${emailSurgeonFormState.draftEmail}, Tone: ${emailSurgeonFormState.tone}`; }
            else if (currentTemplate === 'contractClarifier') { systemPrompt = CONTRACT_CLARIFIER_SYSTEM_PROMPT; userPrompt = `Type: ${contractClarifierFormState.contractType}, Text: ${contractClarifierFormState.contractText}`; }
            else if (currentTemplate === 'coWriter') { systemPrompt = CO_WRITER_SYSTEM_PROMPT; userPrompt = `Stage: ${coWriterFormState.projectStage}, Focus: ${coWriterFormState.currentFocus}, Input: ${coWriterFormState.userInput}`; } 
            else if (currentTemplate === 'universalTranslator') { systemPrompt = UNIVERSAL_TRANSLATOR_SYSTEM_PROMPT; userPrompt = `Translate this to ${universalTranslatorFormState.targetLanguage}: \n\n${universalTranslatorFormState.textToTranslate}`; } 
            else if (currentTemplate === 'universalInk') { systemPrompt = UNIVERSAL_INK_SYSTEM_PROMPT; userPrompt = universalInkFormState.request; } 

            payload = { contents: [{ parts: [{ text: userPrompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
        }

        try {
            const res = await fetch(apiUrl + API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Error');
            
            if (currentTemplate === 'aiLogoGenerator') {
                setGeneratedImage(`data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`);
            } else {
                setGeneratedText(data.candidates[0].content.parts[0].text);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const saveProject = async () => {
        if (!generatedText && !generatedImage) return setAlertMessage("Generate something first!");
        const dataMap = {
            storySmith: storyFormState, lifeLetter: letterFormState, promptArchitect: promptArchitectFormState, brandVoice: brandVoiceFormState,
            homeworkHelper: homeworkHelperFormState, businessAssistant: businessAssistantFormState, digitalProduct: digitalProductFormState,
            marketNeeds: marketNeedsFormState, codeSidekick: codeSidekickFormState, legacyKeeper: legacyKeeperFormState, captionWitch: captionWitchFormState,
            adCopyAlchemist: adCopyAlchemistFormState, aiLogoGenerator: aiLogoGeneratorFormState, resumeRepair: resumeRepairFormState,
            emailSurgeon: emailSurgeonFormState, contractClarifier: contractClarifierFormState, coWriter: coWriterFormState,
            universalTranslator: universalTranslatorFormState, universalInk: universalInkFormState 
        };
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'projects'), {
                userId, timestamp: serverTimestamp(), title: projectTitle || `Untitled ${currentTemplate}`, template: currentTemplate,
                inputData: dataMap[currentTemplate], generatedText: generatedImage || generatedText
            });
            setAlertMessage("Saved!"); setProjectTitle('');
        } catch (e) { setError(e.message); }
    };

    const categories = [
        { id: 'business', name: "Business & Marketing", templates: [
            { id: 'resumeRepair', name: 'Resume Repair Lab', icon: FileText },
            { id: 'marketNeeds', name: 'Market Needs Analyzer', icon: Search },
            { id: 'digitalProduct', name: 'Digital Product Factory', icon: BookCopy },
            { id: 'adCopyAlchemist', name: 'Ad Copy Alchemist', icon: Megaphone },
            { id: 'aiLogoGenerator', name: 'AI Logo Generator', icon: ImageIcon },
            { id: 'businessAssistant', name: 'Business Assistant', icon: Briefcase }, 
            { id: 'brandVoice', name: 'Brand Voice', icon: Sparkles }
        ]},
        { id: 'personal', name: "Personal & Creative", templates: [
            { id: 'universalInk', name: 'Universal Ink', icon: Zap }, 
            { id: 'coWriter', name: 'Co-Writer', icon: PenTool },
            { id: 'legacyKeeper', name: 'Legacy Keeper', icon: Heart },
            { id: 'storySmith', name: 'StorySmith', icon: Feather },
            { id: 'lifeLetter', name: 'Life Letters', icon: Mail }
        ]},
        { id: 'utility', name: "Utility & Tools", templates: [
            { id: 'universalTranslator', name: 'Universal Translator', icon: Globe }, 
            { id: 'contractClarifier', name: 'Contract Clarifier', icon: Scale },
            { id: 'emailSurgeon', name: 'Email Surgeon', icon: Mail }, 
            { id: 'captionWitch', name: 'Caption Witch', icon: Wand2 },
            { id: 'codeSidekick', name: 'Code Sidekick', icon: Code },
            { id: 'promptArchitect', name: 'Prompt Architect', icon: Lightbulb },
            { id: 'homeworkHelper', name: 'Homework Helper', icon: GraduationCap }
        ]}
    ];

    const renderForm = () => {
        const props = { isGenerating, error };
        switch(currentTemplate) {
            case 'storySmith': return <StorySmithForm formState={storyFormState} onChange={handleFormChange(setStoryFormState)} onSubmit={generateContent} {...props} />;
            case 'lifeLetter': return <LifeLetterForm formState={letterFormState} onChange={handleFormChange(setLetterFormState)} onSubmit={generateContent} {...props} />;
            case 'promptArchitect': return <PromptArchitectForm formState={promptArchitectFormState} onChange={handleFormChange(setPromptArchitectFormState)} onSubmit={generateContent} {...props} />;
            case 'brandVoice': return <BrandVoiceForm formState={brandVoiceFormState} onChange={handleFormChange(setBrandVoiceFormState)} onBlur={handleBusinessNameBlur} onSubmit={generateContent} {...props} />;
            case 'homeworkHelper': return <HomeworkHelperForm formState={homeworkHelperFormState} onChange={handleFormChange(setHomeworkHelperFormState)} onSubmit={generateContent} {...props} />;
            case 'businessAssistant': return <BusinessAssistantForm formState={businessAssistantFormState} onChange={handleFormChange(setBusinessAssistantFormState)} onBlur={handleBusinessNameBlur} onSubmit={generateContent} {...props} />;
            case 'digitalProduct': return <DigitalProductForm formState={digitalProductFormState} onChange={handleFormChange(setDigitalProductFormState)} onSubmit={generateContent} {...props} />;
            case 'marketNeeds': return <MarketNeedsForm formState={marketNeedsFormState} onChange={handleFormChange(setMarketNeedsFormState)} onSubmit={generateContent} {...props} />;
            case 'codeSidekick': return <CodeSidekickForm formState={codeSidekickFormState} onChange={handleFormChange(setCodeSidekickFormState)} onSubmit={generateContent} {...props} />;
            case 'legacyKeeper': return <LegacyKeeperForm formState={legacyKeeperFormState} onChange={handleFormChange(setLegacyKeeperFormState)} onSubmit={generateContent} {...props} />;
            case 'captionWitch': return <CaptionWitchForm formState={captionWitchFormState} onChange={handleFormChange(setCaptionWitchFormState)} onSubmit={generateContent} {...props} />;
            case 'adCopyAlchemist': return <AdCopyAlchemistForm formState={adCopyAlchemistFormState} onChange={handleFormChange(setAdCopyAlchemistFormState)} onSubmit={generateContent} {...props} />;
            case 'aiLogoGenerator': return <AiLogoGeneratorForm formState={aiLogoGeneratorFormState} onChange={handleFormChange(setAiLogoGeneratorFormState)} onSubmit={generateContent} {...props} />;
            case 'resumeRepair': return <ResumeRepairForm formState={resumeRepairFormState} onChange={handleFormChange(setResumeRepairFormState)} onSubmit={generateContent} {...props} />;
            case 'emailSurgeon': return <EmailSurgeonForm formState={emailSurgeonFormState} onChange={handleFormChange(setEmailSurgeonFormState)} onSubmit={generateContent} {...props} />;
            case 'contractClarifier': return <ContractClarifierForm formState={contractClarifierFormState} onChange={handleFormChange(setContractClarifierFormState)} onSubmit={generateContent} {...props} />;
            case 'coWriter': return <CoWriterForm formState={coWriterFormState} onChange={handleFormChange(setCoWriterFormState)} onSubmit={generateContent} {...props} />;
            case 'universalTranslator': return <UniversalTranslatorForm formState={universalTranslatorFormState} onChange={handleFormChange(setUniversalTranslatorFormState)} onSubmit={generateContent} {...props} />; 
            case 'universalInk': return <UniversalInkForm formState={universalInkFormState} onChange={handleFormChange(setUniversalInkFormState)} onSubmit={generateContent} {...props} />; 
            default: return null;
        }
    };

    const activeDesc = {
        storySmith: "Turn your raw ideas into gripping, human-grade scenes.",
        lifeLetter: "Write the hard letters you've been avoiding.",
        promptArchitect: "Generate expert-level prompts for other AI models.",
        brandVoice: "Write origin stories, about pages, and mission statements with soul.",
        homeworkHelper: "Get clear explanations and help with your homework.",
        businessAssistant: "Your AI assistant for business plans, invoices, proposals, and more.",
        digitalProduct: "Craft a complete ebook, course, or webinar script from scratch.",
        marketNeeds: "Uncover unfulfilled market needs and customer pain points.",
        codeSidekick: "Your AI pair-programming partner. Generate, debug, or explain code.",
        legacyKeeper: "Organize messy notes and memories into a clean, readable story.",
        captionWitch: "Create social media captions with real personality and flavor.",
        adCopyAlchemist: "Generate high-converting ad copy, hooks, and taglines.",
        aiLogoGenerator: "Generate a professional logo in 60 seconds.",
        resumeRepair: "Transform your resume into a powerful, achievement-oriented document.",
        emailSurgeon: "Fix, rewrite, or rewire any email to sound professional and effective.",
        contractClarifier: "Understand the fine print. Get clear breakdowns of legal documents.",
        coWriter: "Collaborate with an expert novelist to brainstorm, draft, and refine your story.",
        universalTranslator: "Translate text into any language while preserving tone and formatting.", 
        universalInk: "Your blank canvas. Ask ReFURRMed Ink to write, edit, or create anything." 
    }[currentTemplate];

    if (!isAuthReady) return <div className="min-h-screen bg-white dark:bg-obsidian-black flex items-center justify-center text-deep-teal-byte dark:text-silver-mist"><Loader className="w-8 h-8 mr-3 animate-spin text-aqua-pulse" /> Initializing...</div>;

    return (
        <>
            <StyleInjector />
            <div className="min-h-screen bg-white dark:bg-obsidian-black font-ui flex flex-col">
                <header className="bg-white/80 dark:bg-obsidian-black/70 backdrop-blur-sm shadow-md p-4 flex justify-between items-center border-b border-silver-mist/30 dark:border-deep-teal-byte/30">
                    <div>
                        <h1 className="font-logo text-2xl font-extrabold text-deep-teal-byte dark:text-silver-mist uppercase"><span className="text-aqua-pulse">ReFURRMed</span> Ink</h1>
                        <p className="font-body text-xs text-deep-teal-byte/70 dark:text-silver-mist/70 italic">Ink with a pulse!</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {userProfile?.subscriptionStatus === 'pro' ? <span className="px-3 py-1 text-xs font-semibold rounded-full bg-aqua-pulse/20 text-aqua-pulse uppercase">Pro Member</span> : <button onClick={() => setShowPricingModal(true)} className="px-4 py-1 text-xs font-bold rounded-full bg-neural-violet text-white uppercase">Upgrade</button>}
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-silver-mist/50 dark:bg-deep-teal-byte/40 text-deep-teal-byte dark:text-aqua-pulse">{isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}</button>
                        <button onClick={() => setCurrentView(currentView === 'template' ? 'history' : 'template')} className="p-2 rounded-full bg-silver-mist/50 dark:bg-deep-teal-byte/40 text-deep-teal-byte dark:text-aqua-pulse">{currentView === 'template' ? <History className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}</button>
                    </div>
                </header>

                <main className="flex-grow flex overflow-hidden h-[calc(100vh-80px)]">
                    {currentView === 'template' ? (
                        <>
                            <div className="w-1/3
 p-6 bg-gray-100 dark:bg-obsidian-black/50 border-r border-silver-mist/30 dark:border-deep-teal-byte/30 overflow-y-auto">
                                <div className="mb-6 space-y-4">
                                    {categories.map(cat => (
                                        <div key={cat.id}>
                                            <button onClick={() => toggleCategory(cat.id)} className="flex justify-between w-full text-xs uppercase font-bold text-deep-teal-byte/60 dark:text-silver-mist/60 mb-2"><span>{cat.name}</span><ChevronDown className={`w-4 h-4 ${openCategories.includes(cat.id) ? 'rotate-180' : ''}`} /></button>
                                            {openCategories.includes(cat.id) && <div className="space-y-1 pl-2 border-l border-silver-mist/30">{cat.templates.map(t => (
                                                <button key={t.id} onClick={() => handleTemplateChange(t.id)} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium w-full text-left ${currentTemplate === t.id ? 'bg-deep-teal-byte/10 text-deep-teal-byte dark:bg-aqua-pulse/20 dark:text-aqua-pulse' : 'text-deep-teal-byte/70 dark:text-silver-mist/70 hover:bg-silver-mist/50'}`}><t.icon className="w-4 h-4 mr-2" />{t.name}</button>
                                            ))}</div>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-deep-teal-byte/80 dark:text-silver-mist/80 mb-6">{activeDesc}</p>
                                {renderForm()}
                            </div>
                            <div className="w-2/3 p-6 bg-white dark:bg-obsidian-black overflow-y-auto">
                                <div className="min-h-[50vh] border border-silver-mist/30 dark:border-deep-teal-byte/50 rounded-lg bg-gray-100 dark:bg-obsidian-black p-6 shadow-inner">
                                    <div className="flex justify-end space-x-2 mb-4">
                                        <button onClick={() => copyToClipboard(generatedText)} disabled={!generatedText} className="p-2 hover:text-aqua-pulse"><Copy className="w-5 h-5" /></button>
                                        <button onClick={saveProject} disabled={!generatedText && !generatedImage} className="p-2 hover:text-aqua-pulse"><Save className="w-5 h-5" /></button>
                                    </div>
                                    {generatedImage ? <img src={generatedImage} className="max-w-full rounded-lg" /> : 
                                     generatedText ? <div className="prose dark:prose-invert max-w-none text-sm text-obsidian-black/80 dark:text-silver-mist/90 leading-relaxed whitespace-pre-wrap">{generatedText}</div> : 
                                     <div className="text-center py-20 opacity-50">Output will appear here...</div>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex">
                            <div className="w-1/3 p-6 bg-gray-100 dark:bg-obsidian-black/50 border-r border-silver-mist/30 overflow-y-auto">
                                <h2 className="text-xl font-bold mb-4 dark:text-white">History</h2>
                                {projects.map(p => (
                                    <div key={p.id} onClick={() => setSelectedProject(p)} className="p-3 mb-2 bg-white dark:bg-obsidian-black/80 rounded shadow cursor-pointer hover:shadow-md">
                                        <div className="font-bold text-sm dark:text-silver-mist">{p.title}</div>
                                        <div className="text-xs text-aqua-pulse">{p.template} • {p.timestamp}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="w-2/3 p-6 bg-white dark:bg-obsidian-black overflow-y-auto">
                                {selectedProject ? (
                                    <div className="prose dark:prose-invert max-w-none">
                                        <h2 className="text-2xl font-bold text-deep-teal-byte dark:text-silver-mist">{selectedProject.title}</h2>
                                        {selectedProject.template === 'aiLogoGenerator' ? <img src={selectedProject.generatedText} className="mt-4 rounded" /> : <div className="mt-4 whitespace-pre-wrap">{selectedProject.generatedText}</div>}
                                    </div>
                                ) : <div className="text-center py-20 opacity-50">Select a project</div>}
                            </div>
                        </div>
                    )}
                </main>
                
                {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}
                {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} onSubscribe={handleSubscriptionClick} />}
            </div>
        </>
    );
};

export default App;
import { useState } from 'react'
import { 
  Ghost, 
  Pen, 
  Sparkles, 
  History, 
  FileText, 
  Settings,
  ChevronRight,
  Send,
  Wand2,
  RotateCcw,
  Copy,
  Download,
  Menu,
  X,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

// Mock AI functions (stubs as mentioned in README)
const callManuscriptAPI = async (prompt) => {
  await new Promise(resolve => setTimeout(resolve, 1500))
  return `Here is a continuation based on your prompt...\n\nThe ink dried on the page, but the words still seemed to shimmer with possibility. Each sentence carried the weight of unspoken intention, waiting for the reader to breathe life into its contours.`
}

const callClarityAPI = async (question) => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return `Consider the timeline implications:\n- Check if the dates align with your narrative arc\n- Verify character ages at key plot points\n- Ensure historical accuracy for any real-world references`
}

function App() {
  const [activeMode, setActiveMode] = useState('draft') // draft, edit, admin, library
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('style') // style, plot, clarity
  const [styleAnchor, setStyleAnchor] = useState('')
  const [plotPrompt, setPlotPrompt] = useState('')
  const [clarityQuestion, setClarityQuestion] = useState('')
  const [clarityResponse, setClarityResponse] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [history, setHistory] = useState([])
  const [linkedFile, setLinkedFile] = useState(null)
  const [syncStatus, setSyncStatus] = useState('linked') // linked, unsynced, synced

  // Demo content
  const demoChapters = [
    { id: 1, title: 'Chapter 1: The Beginning', lastEdited: '2 hours ago' },
    { id: 2, title: 'Chapter 2: The Journey', lastEdited: '1 day ago' },
    { id: 3, title: 'Chapter 3: The Confrontation', lastEdited: '3 days ago' }
  ]

  const handleGenerate = async () => {
    if (!inputText.trim()) return
    
    setIsGenerating(true)
    try {
      const result = await callManuscriptAPI({
        style: styleAnchor,
        context: inputText,
        plotDirection: plotPrompt
      })
      setOutputText(result)
      setHistory(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        preview: result.substring(0, 50) + '...',
        type: 'generation'
      }, ...prev])
    } catch (error) {
      console.error('Generation failed:', error)
    }
    setIsGenerating(false)
  }

  const handleClarityCheck = async () => {
    if (!clarityQuestion.trim()) return
    
    setIsGenerating(true)
    try {
      const response = await callClarityAPI(clarityQuestion)
      setClarityResponse(response)
    } catch (error) {
      console.error('Clarity check failed:', error)
    }
    setIsGenerating(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText)
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-gray-100 overflow-hidden">
      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[#0d1117] border-r border-[#1e293b] transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Ghost className="w-8 h-8 text-[#00F0FF]" />
              <span className="font-bold text-xl">Inked</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <nav className="p-4 space-y-2">
              <button 
                onClick={() => setActiveMode('draft')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'draft' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <Pen size={18} />
                <span>Draft</span>
              </button>
              <button 
                onClick={() => setActiveMode('edit')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'edit' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <Wand2 size={18} />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => setActiveMode('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'admin' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <FileText size={18} />
                <span>Admin Desk</span>
              </button>
              <button 
                onClick={() => setActiveMode('library')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'library' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <BookOpen size={18} />
                <span>Library</span>
              </button>
            </nav>

            <div className="p-4 border-t border-[#1e293b]">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Chapters</h3>
              <div className="space-y-2">
                {demoChapters.map(chapter => (
                  <button key={chapter.id} className="w-full text-left px-3 py-2 rounded hover:bg-[#1e293b] text-sm text-gray-400 hover:text-white transition-colors">
                    {chapter.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-[#1e293b]">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1e293b] transition-colors text-gray-400">
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-[#0d1117] border-b border-[#1e293b] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium">Inked Ghost-Writer</h1>
            <span className="px-2 py-1 bg-[#008080]/20 text-[#00F0FF] text-xs rounded border border-[#008080]/30">
              AI Co-Author
            </span>
          </div>
          <div className="flex items-center gap-4">
            {linkedFile && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
                syncStatus === 'synced' ? 'bg-green-500/20 text-green-400' :
                syncStatus === 'unsynced' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-green-400' :
                  syncStatus === 'unsynced' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`}></span>
                <span className="capitalize">{syncStatus}</span>
                <span className="text-gray-400">| {linkedFile}</span>
              </div>
            )}
            <button className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors">
              <History size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[#1e293b] rounded-lg text-sm hover:bg-[#2d3748] transition-colors">
                  Notebook Width
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Last autosave: 2 min ago</span>
              </div>
            </div>

            <div className="flex-1 bg-[#0d1117] rounded-xl border border-[#1e293b] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
                <span className="text-sm text-gray-400">Chapter Draft</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-[#1e293b] rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                  <button className="p-2 hover:bg-[#1e293b] rounded transition-colors">
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-auto">
                {outputText ? (
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">{outputText}</p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Start writing or use AI to generate content...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="mt-4 bg-[#0d1117] rounded-xl border border-[#1e293b] p-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Continue your story or describe what you want to generate..."
                className="w-full bg-transparent resize-none focus:outline-none text-gray-300 placeholder-gray-500"
                rows={3}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setLinkedFile(linkedFile ? null : 'document.md')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      linkedFile ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'bg-[#1e293b] hover:bg-[#2d3748]'
                    }`}
                  >
                    {linkedFile ? '📎 Linked' : '📎 Link File'}
                  </button>
                </div>
                <button
