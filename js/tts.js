class TextToSpeech {
    constructor() {
        this.isEnabled = localStorage.getItem('tts-enabled') === 'true';
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.initUI();
        this.initHoverEvents();
    }

    initUI() {
        // Ensure only one button is created
        if (document.getElementById('tts-toggle-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'tts-toggle-btn';
        btn.className = `fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.2)] transition-all transform hover:scale-110 ${this.isEnabled ? 'bg-[#40916C] text-white' : 'bg-white dark:bg-[#1C1C1E] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'}`;
        btn.innerHTML = `<span class="material-symbols-outlined text-2xl">${this.isEnabled ? 'volume_up' : 'volume_off'}</span>`;
        btn.title = 'Toggle Text-to-Speech (Hover to read)';
        
        btn.addEventListener('click', () => {
            this.isEnabled = !this.isEnabled;
            localStorage.setItem('tts-enabled', this.isEnabled);
            btn.className = `fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.2)] transition-all transform hover:scale-110 ${this.isEnabled ? 'bg-[#40916C] text-white' : 'bg-white dark:bg-[#1C1C1E] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'}`;
            btn.innerHTML = `<span class="material-symbols-outlined text-2xl">${this.isEnabled ? 'volume_up' : 'volume_off'}</span>`;
            
            if (this.isEnabled) {
                this.speak('Speech enabled');
            } else {
                this.stop();
            }
        });

        document.body.appendChild(btn);
    }

    speak(text) {
        if (!this.isEnabled || !text) return;
        this.stop();
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        // Find best voice
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) || voices[0];
        if (preferredVoice) {
            this.currentUtterance.voice = preferredVoice;
        }

        this.synthesis.speak(this.currentUtterance);
    }

    stop() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
    }

    initHoverEvents() {
        let hoverTimer = null;
        let lastReadText = '';
        
        document.body.addEventListener('mouseover', (e) => {
            if (!this.isEnabled) return;
            
            // Ignore the TTS button itself
            if(e.target.closest('#tts-toggle-btn')) return;

            const el = e.target;
            
            // Ignore massive structural wrappers to prevent reading the entire page content at once 
            // when the mouse is over an empty gap between elements.
            if (['BODY', 'HTML', 'MAIN', 'SECTION'].includes(el.tagName)) return;

            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => {
                if (el.matches(':hover') || el.contains(document.querySelector(':hover'))) {
                    // Try to get visible text
                    let textToRead = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
                    
                    // Don't replay the exact same text if we're just sliding between adjacent child nodes of the same simple parent
                    if(textToRead.length > 0 && textToRead !== lastReadText) {
                        this.speak(textToRead);
                        lastReadText = textToRead;
                    }
                }
            }, 300); // 300ms delay for snappier feedback
        });

        document.body.addEventListener('mouseout', (e) => {
             clearTimeout(hoverTimer);
        });
    }
}

// Make globally available
window.TTS = null;
function initTTS() {
    if (!window.TTS && window.speechSynthesis) {
        window.TTS = new TextToSpeech();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTTS();
    // Some browsers load voices asynchronously
    if(window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = initTTS;
    }
});
