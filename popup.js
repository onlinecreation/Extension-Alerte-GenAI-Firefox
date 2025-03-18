let isSubmitting = false;

document.addEventListener('DOMContentLoaded', () => {
  // Get current URL
  browser.tabs.query({active: true, currentWindow: true})
    .then(tabs => {
      document.getElementById('siteUrl').value = tabs[0].url;
    });

  const form = document.getElementById('reportForm');
  const submitButton = document.querySelector('button[type="submit"]');

  // Gestion des événements de formulaire
  form.addEventListener('submit', handleSubmit);
  
  // Gestion spécifique des événements tactiles
  submitButton.addEventListener('touchstart', () => {
    submitButton.style.backgroundColor = '#3d8b40';
  });
  
  submitButton.addEventListener('touchend', () => {
    submitButton.style.backgroundColor = '';
  });

  // Désactiver le zoom sur les inputs sur mobile
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.style.fontSize = '16px';
    });
  });
});

async function handleSubmit(e) {
  e.preventDefault();
  e.stopPropagation();

  if (isSubmitting) {
    return false;
  }

  const submitButton = document.querySelector('button[type="submit"]');
  const successMessage = document.getElementById('successMessage');
  
  try {
    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours...';

    const report = {
      url: document.getElementById('siteUrl').value,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Vérification de la connexion
    if (!navigator.onLine) {
      throw new Error('Pas de connexion Internet');
    }

    const response = await sendReport(report);
    
    // Affichage du succès
    successMessage.style.display = 'block';
    successMessage.textContent = 'Site signalé avec succès !';
    document.getElementById('reportForm').reset();

    // Fermeture différée avec animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    successMessage.style.opacity = '0';
    successMessage.style.transition = 'opacity 0.5s ease';
    await new Promise(resolve => setTimeout(resolve, 500));
    window.close();

  } catch (error) {
    // Message d'erreur plus convivial
    let errorMessage = 'Une erreur est survenue. ';
    if (!navigator.onLine) {
      errorMessage += 'Vérifiez votre connexion Internet.';
    } else if (error.name === 'TypeError') {
      errorMessage += 'Impossible de contacter le serveur.';
    } else {
      errorMessage += error.message;
    }

    // Affichage de l'erreur dans l'interface
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '10px';
    errorDiv.style.marginTop = '10px';
    errorDiv.textContent = errorMessage;
    document.getElementById('reportForm').appendChild(errorDiv);

    // Auto-suppression du message d'erreur après 5 secondes
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);

  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Signaler ce site';
  }

  return false;
}

async function sendReport(report) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://genai.gavois.fr:42001/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La requête a pris trop de temps');
    }
    throw error;
  }
}