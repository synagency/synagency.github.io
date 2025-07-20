// Script de débogage pour forcer l'ajout de Lea et diagnostic
console.log('=== DIAGNOSTIC COMPLET ===');

// Vérifier localStorage
const currentModels = JSON.parse(localStorage.getItem('models') || '[]');
console.log('📊 Modèles actuels:', currentModels);

// Si Lea n'existe pas, l'ajouter
const leaExists = currentModels.find(m => m.name === 'Lea');
if (!leaExists) {
    console.log('❌ Lea n\'existe pas, ajout...');
    const newLea = {
        id: Date.now(),
        name: 'Lea',
        onlyfansName: 'Leaaaa',
        commission: 30,
        estimatedRevenue: 0,
        dateAdded: new Date().toISOString()
    };
    currentModels.push(newLea);
    localStorage.setItem('models', JSON.stringify(currentModels));
    console.log('✅ Lea ajoutée:', newLea);
} else {
    console.log('✅ Lea existe déjà:', leaExists);
}

// Vérifier les éléments DOM
const modelsList = document.getElementById('models-list');
console.log('📋 Container models-list trouvé:', !!modelsList);
if (modelsList) {
    console.log('   - Display actuel:', modelsList.style.display);
    console.log('   - Enfants:', modelsList.children.length);
}

// Forcer le rechargement si la fonction existe
if (typeof loadModelsFromStorage === 'function') {
    console.log('🔄 Rechargement des modèles...');
    loadModelsFromStorage();
} else {
    console.log('❌ Fonction loadModelsFromStorage non trouvée');
}

// Forcer l'affichage de la liste
if (modelsList && currentModels.length > 0) {
    modelsList.style.display = 'grid';
    console.log('🔧 Display forcé à grid');
}

console.log('=== FIN DIAGNOSTIC ===');
