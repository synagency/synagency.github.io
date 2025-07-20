// Script pour ajouter le modèle Lea
console.log('Ajout du modèle Lea...');

// Créer l'objet modèle
const newModel = {
    id: Date.now(),
    name: 'Lea',
    onlyfansName: 'Leaaaa',
    commission: 30,
    estimatedRevenue: 0,
    dateAdded: new Date().toISOString()
};

// Récupérer les modèles existants ou créer un tableau vide
let models = JSON.parse(localStorage.getItem('models') || '[]');

// Ajouter le nouveau modèle
models.push(newModel);

// Sauvegarder dans le localStorage
localStorage.setItem('models', JSON.stringify(models));

console.log('✅ Modèle Lea ajouté avec succès:', newModel);
console.log('📊 Total des modèles:', models.length);

// Afficher un message de confirmation
alert(`✅ Modèle "${newModel.name}" ajouté avec succès!\n\n📋 Détails:\n• Nom: ${newModel.name}\n• OnlyFans: ${newModel.onlyfansName}\n• Commission: ${newModel.commission}%`);

// Recharger la page pour voir les modifications
window.location.reload();
