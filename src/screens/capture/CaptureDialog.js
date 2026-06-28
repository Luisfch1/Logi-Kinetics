/**
 * CaptureDialog.js (Nexus Shield v182)
 * Diálogo de Confirmación y Procesamiento (Minimalista / Stitch-Style)
 */
export const CaptureDialog = {
    overlay: null,

    show(message, onConfirm, isProcessing = false) {
        this._renderBase(message, isProcessing);
        if (!isProcessing && typeof onConfirm === 'function') {
            const btnConfirm = this.overlay.querySelector('#dlg-confirm');
            if (btnConfirm) btnConfirm.onclick = () => { onConfirm(); this.hide(); };
        }
    },

    showPrompt(message, placeholder, onConfirm) {
        this._renderBase(message, false, true, placeholder);
        const btnConfirm = this.overlay.querySelector('#dlg-confirm');
        const input = this.overlay.querySelector('#dlg-input');
        if (btnConfirm && input) {
            btnConfirm.onclick = () => {
                if (typeof onConfirm === 'function') onConfirm(input.value.toUpperCase());
                this.hide();
            };
        }
    },

    _renderBase(message, isProcessing = false, isPrompt = false, placeholder = "") {
        this.hide();
        this.overlay = document.createElement('div');
        this.overlay.id = 'capture-dialog-overlay';
        this.overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 px-10';
        
        this.overlay.innerHTML = `
            <div class="bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-8 w-full max-w-[320px] space-y-6 shadow-2xl scale-in-center overflow-hidden">
                <div class="space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em]">Sistema de Gestión Logi</span>
                    </div>
                    <p class="text-[11px] text-white/80 font-body uppercase leading-relaxed tracking-widest font-bold">${message}</p>
                </div>
                
                ${isPrompt ? `
                <div class="pt-2">
                    <input id="dlg-input" type="text" placeholder="${placeholder}" 
                           class="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-[10px] text-white font-bold uppercase outline-none focus:border-primary/50 transition-all">
                </div>
                ` : ''}

                ${!isProcessing ? `
                <div class="flex gap-3 pt-2">
                    <button id="dlg-cancel" class="flex-1 h-12 rounded-2xl bg-white/5 border border-white/5 text-[9px] text-white/30 font-black uppercase active:bg-white/10 transition-all">
                        Cancelar
                    </button>
                    <button id="dlg-confirm" class="flex-1 h-12 rounded-2xl bg-primary text-[10px] text-black font-black uppercase active:scale-95 transition-all shadow-neon">
                        Confirmar
                    </button>
                </div>
                ` : `
                <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-primary animate-progress shadow-neon"></div>
                </div>
                `}
            </div>
        `;

        document.body.appendChild(this.overlay);
        const btnCancel = this.overlay.querySelector('#dlg-cancel');
        if (btnCancel) btnCancel.onclick = () => this.hide();
    },

    hide() {
        const existing = document.getElementById('capture-dialog-overlay');
        if (existing) existing.remove();
        this.overlay = null;
    }
};
