document.addEventListener('DOMContentLoaded', async () => {
    const listTypes = ['genai', 'redflag', 'amf'];
    const statusElement = document.getElementById('status');

    async function loadListStates() {
        try {
            const storageData = await browser.storage.local.get('enabledLists');    
            const enabledLists = storageData.enabledLists || {
                'genai': true,
                'redflag': true,
                'amf': true
            };
            
            if (!storageData.enabledLists) {
                await browser.storage.local.set({ enabledLists });
            }
            
            listTypes.forEach(type => {
                const toggle = document.getElementById(`${type}-toggle`);
                if (!toggle) {
                    return;
                }
                
                const isChecked = enabledLists[type] !== false;                
                toggle.checked = isChecked;
            });
        } catch (error) {
            showStatus('Erreur de chargement des états', false);
        }
    }

    async function updateListCount(type) {
        try {
            const countElement = document.getElementById(`${type}-count`);
            const dateElement = document.getElementById(`${type}-date`);
            
            if (!countElement) {
                return;
            }
    
            const response = await browser.runtime.sendMessage({
                action: 'getListCount',
                type: type,
            });
            
            if (response && response.count !== undefined) {
                countElement.textContent = typeof response.count === 'object' 
                    ? response.count.count 
                    : response.count;
            } else {
                countElement.textContent = 'N/A';
            }
            
            if (dateElement) {
                const timestampKey = `plainList_${type}_timestamp`;
                const bloomTimestampKey = 'bloomFilterTimestamp';
                const result = await browser.storage.local.get([timestampKey, bloomTimestampKey]);
                
                let timestamp;
                if (type === 'genai') {
                    timestamp = result[bloomTimestampKey];
                } else {
                    timestamp = result[timestampKey];
                }
                
                if (timestamp) {
                    const date = new Date(timestamp);
                    dateElement.textContent = date.toLocaleString();
                } else {
                    dateElement.textContent = 'Jamais mise à jour';
                }
            }
        } catch (error) {
            const countElement = document.getElementById(`${type}-count`);
            if (countElement) {
                countElement.textContent = 'Erreur';
            }
        }
    }

    window.displayLastUpdateTime = async function() {
        try {
            const { lastListUpdateFormatted } = await browser.storage.local.get('lastListUpdateFormatted');
            const lastUpdateElement = document.getElementById('last-update-time');
            
            if (lastUpdateElement) {
                lastUpdateElement.textContent = lastListUpdateFormatted 
                    ? `Dernière mise à jour globale : ${lastListUpdateFormatted}`
                    : 'Aucune mise à jour globale effectuée';
            }
        } catch (error) {
        }
    }

    function showStatus(message, isSuccess = true) {
        statusElement.textContent = message;
        statusElement.className = isSuccess ? 'status-success' : 'status-error';
        
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, 3000);
    }

    async function toggleList(type, enabled) {
        try {
            const result = await browser.runtime.sendMessage({
                action: 'toggleList',
                type: type,
                enabled: enabled
            });

            if (result && result.success) {
                showStatus(`Liste ${type} ${enabled ? 'activée' : 'désactivée'}`, true);
            } else {
                showStatus(`Erreur lors de la modification de la liste ${type}`, false);
            }
        } catch (error) {
            showStatus(`Erreur de communication: ${error.message}`, false);
        }
    }

    listTypes.forEach(type => {
        const toggle = document.getElementById(`${type}-toggle`);
        if (toggle) {
            toggle.addEventListener('change', (event) => {
                toggleList(type, event.target.checked);
            });
        }
    });

    await loadListStates();
    
    for (const type of listTypes) {
        await updateListCount(type);
    }
    
    await window.displayLastUpdateTime();

    window.updateLists = async function() {
        try {
            showStatus('Mise à jour des listes en cours...', true);
            
            await browser.runtime.sendMessage({ action: 'updateAllLists' });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            for (const type of listTypes) {
                await updateListCount(type);
            }
            
            await window.displayLastUpdateTime();
            
            showStatus('Mise à jour des listes terminée', true);
        } catch (error) {
            showStatus('Erreur lors de la mise à jour des listes', false);
        }
    }

    document.getElementById('update-lists').addEventListener('click', window.updateLists);
});

browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === 'updateListCount') {
        const element = document.getElementById(`${message.type}-count`);
        if (element) {
            element.textContent = message.count;
        }
    }
});