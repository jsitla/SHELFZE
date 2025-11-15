const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'contexts', 'translations.js');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Italian translations
const italianTranslations = [
	"\t\tnutrition: 'Nutrizione',",
	"\t\tcalories: 'Calorie',",
	"\t\tprotein: 'Proteine',",
	"\t\tcarbs: 'Carboidrati',",
	"\t\tfat: 'Grassi',",
	"\t\tperServing: 'per porzione',",
	"\t\tallTime: 'Tutte',",
	"\t\tquickRecipes: 'Veloci (< 30 min)',",
	"\t\tmediumRecipes: 'Medie (30-60 min)',",
	"\t\tlongRecipes: 'Lunghe (> 60 min)',",
	"\t\tallDiets: 'Tutte',",
	"\t\tvegetarian: 'Vegetariana',",
	"\t\tvegan: 'Vegana',",
	"\t\tglutenFree: 'Senza glutine',",
	"\t\tlowCalorie: 'Basso contenuto calorico',",
	"\t\trateThisRecipe: 'Valuta questa ricetta',",
	"\t\twouldMakeAgain: 'La rifarei',",
	"\t\tsaveRating: 'Salva valutazione',",
	"\t\tratingSaved: 'Valutazione salvata!',",
	"\t\tthankYouFeedback: 'Grazie per il tuo feedback!',",
	"\t\tfailedToSaveRating: 'Impossibile salvare la valutazione',",
	"\t\taddToCollection: 'Aggiungi alla raccolta',",
	"\t\tfavorite: 'Preferito',",
	"\t\tcooked: 'Cucinato',",
	"\t\twantToTry: 'Voglio provare',",
	"\t\tcollectionUpdated: 'Raccolta aggiornata!',",
	"\t\taddedToFavorites: 'Aggiunto ai preferiti',",
	"\t\tremovedFromFavorites: 'Rimosso dai preferiti',",
	"\t\tmarkedAsCooked: 'Segnato come cucinato',",
	"\t\tremovedFromCooked: 'Rimosso dai cucinati',",
	"\t\taddedToWantToTry: 'Aggiunto alla lista \"Voglio provare\"',",
	"\t\tremovedFromWantToTry: 'Rimosso dalla lista \"Voglio provare\"',",
	"\t\tfailedToUpdateCollection: 'Impossibile aggiornare la raccolta',",
	"\t\tsavedRecipes: 'Ricette salvate',",
	"\t\tfavorites: 'Preferiti',",
	"\t\tnoRecipesMatchFilter: 'Nessuna ricetta corrisponde ai filtri',",
	"\t\ttryDifferentFilter: 'Prova filtri diversi',",
	"\t\tclearFilters: 'Cancella filtri',",
	"\t\tingredientsToInclude: 'Ingredienti da includere',",
	"\t\tingredientsAvailableForRecipe: 'ingredienti disponibili per la ricetta',",
	"\t\tadditionalGuidance: 'Istruzioni aggiuntive',",
	"\t\tguidancePlaceholder: 'Ad esempio: niente noci, basso contenuto di sodio...',",
	"\t\tclearGuidance: 'Cancella istruzioni',",
	"\t\topen: 'Apri',",
	"\t\tconfirmRemove: 'Conferma rimozione',",
	"\t\tconfirmRemoveMessage: 'Sei sicuro di voler rimuovere questa ricetta?',",
	"\t\tremoved: 'Rimosso',",
	"\t\trecipeRemoved: 'Ricetta rimossa',",
	"\t\tfailedToRemove: 'Impossibile rimuovere la ricetta',",
	"\t\tselectAll: 'Seleziona tutto',",
	"\t\tdeselectAll: 'Deseleziona tutto',",
	"\t\taccount: 'Account',",
	"\t\tmyAccount: 'Il mio account',",
	"\t\tlogin: 'Accedi',",
	"\t\tloginOrSignup: 'Accedi / Registrati',",
	"\t\tcreateAccount: 'Crea account',",
	"\t\talreadyHaveAccount: 'Hai già un account?',",
	"\t\tsignOut: 'Esci',",
	"\t\tsignOutConfirm: 'Sei sicuro di voler uscire?',",
	"\t\tsignedOutSuccess: 'Disconnessione riuscita',",
	"\t\tloginSuccess: 'Accesso riuscito',",
	"\t\tloginFailed: 'Accesso fallito',",
	"\t\tsignupFailed: 'Registrazione fallita',",
	"\t\tupgradeFailed: 'Aggiornamento fallito',",
	"\t\taccountCreated: 'Account creato con successo!',",
	"\t\taccountUpgraded: 'Account aggiornato con successo!',",
	"\t\tyouNowHave: 'Ora hai',",
	"\t\tscans: 'scansioni',",
	"\t\tpassword: 'Password',",
	"\t\tconfirmPassword: 'Conferma password',",
	"\t\tdisplayName: 'Nome visualizzato',",
	"\t\tfillAllFields: 'Compila tutti i campi',",
	"\t\tpasswordsDoNotMatch: 'Le password non corrispondono',",
	"\t\tpasswordTooShort: 'La password deve contenere almeno 6 caratteri',",
	"\t\tinvalidEmail: 'Indirizzo email non valido',",
	"\t\tuserDisabled: 'Questo account è stato disabilitato',",
	"\t\tuserNotFound: 'Nessun account trovato con questo indirizzo email',",
	"\t\twrongPassword: 'Password errata',",
	"\t\tinvalidCredentials: 'Credenziali non valide',",
	"\t\ttooManyAttempts: 'Troppi tentativi. Riprova più tardi',",
	"\t\tnetworkError: 'Errore di rete. Controlla la tua connessione',",
	"\t\temailInUse: 'Questo indirizzo email è già in uso',",
	"\t\tweakPassword: 'La password è troppo debole',",
	"\t\tguestAccount: 'Account ospite',",
	"\t\tpermanentAccount: 'Account permanente',",
	"\t\tguestAccountWarning: 'I tuoi dati potrebbero essere persi se disinstalli l\\'app',",
	"\t\tuserId: 'ID utente',",
	"\t\tupgradeAccount: 'Aggiorna account',",
	"\t\tupgradeAccountDesc: 'Crea un account permanente per salvare i tuoi dati',",
	"\t\tupgradeNow: 'Aggiorna ora',",
	"\t\texistingAccount: 'Account esistente',",
	"\t\texistingAccountDesc: 'Accedi per sincronizzare i tuoi dati',",
	"\t\tloginExisting: 'Accedi con un account esistente',",
	"\t\tswitchedToExistingAccount: 'Passato all\\'account esistente',",
	"\t\twelcomeTagline: 'La tua dispensa intelligente. Zero sprechi.',",
	"\t\twelcomeTitle: 'Benvenuto su Shelfze',",
	"\t\twelcomeSubtitle: 'Traccia il cibo. Genera ricette. Riduci gli sprechi.',",
	"\t\ttryItFirst: 'Provalo prima',",
	"\t\tnoAccountNeeded: 'Nessun account necessario per iniziare',",
	"\t\tstartScanningNow: 'Inizia a scansionare ora',",
	"\t\tguestScansLimit: 'Limite: 50 scansioni',",
	"\t\tguestRecipesLimit: 'Limite: 5 ricette',",
	"\t\tdataSavedLocally: 'Dati salvati localmente',",
	"\t\tcontinueAsGuest: 'Continua come ospite',",
	"\t\tcreateFreeAccount: 'Crea un account gratuito',",
	"\t\trecommended: 'Consigliato',",
	"\t\tfreeScansLimit: '250 scansioni/mese',",
	"\t\tfreeRecipesLimit: '50 ricette/mese',",
	"\t\tmonthlyBonus: 'Bonus mensile',",
	"\t\tsyncAcrossDevices: 'Sincronizzazione tra dispositivi',",
	"\t\tsecureBackup: 'Backup sicuro',",
	"\t\tgetStarted: 'Inizia',",
	"\t\tupgradeAnytime: 'Puoi passare a Premium in qualsiasi momento',",
	"\t\ttier: 'Livello',",
	"\t\tanonymous: 'Anonimo',",
	"\t\tfree: 'Gratuito',",
	"\t\tscansRemaining: 'Scansioni rimanenti',",
	"\t\trecipesRemaining: 'Ricette rimanenti',",
	"\t\tunlimited: 'Illimitato',",
	"\t\tupgradeToPremium: 'Passa a Premium',",
	"\t\tlimitReached: 'Limite raggiunto',",
	"\t\tscansLimitReached: 'Limite di scansioni raggiunto',",
	"\t\trecipesLimitReached: 'Limite di ricette raggiunto',",
	"\t\tcreateAccountToGetMore: 'Crea un account per ottenere più scansioni e ricette',",
	"\t\tupgradeToPremiumMessage: 'Passa a Premium per scansioni e ricette illimitate',",
	"\t\tmonthlyBonusAdded: 'Bonus mensile aggiunto!',",
	"\t\tgiftCode: 'Codice regalo',",
	"\t\tredeemGiftCode: 'Riscatta codice regalo',",
	"\t\tenterGiftCode: 'Inserisci il tuo codice regalo',",
	"\t\tredeem: 'Riscatta',",
	"\t\tgiftCodeSuccess: 'Codice regalo riscattato con successo!',",
	"\t\tgiftCodeInvalid: 'Codice regalo non valido',",
	"\t\tgiftCodeUsed: 'Questo codice è già stato utilizzato',",
	"\t\tgiftCodeExpired: 'Questo codice è scaduto',",
	"\t\thaveGiftCode: 'Hai un codice regalo?',"
];

// Find Italian section end (around line 1348)
let itLineIndex = -1;
for (let i = 1340; i < 1360; i++) {
	if (lines[i] && lines[i].includes("Impossibile aggiornare")) {
		itLineIndex = i;
		break;
	}
}

if (itLineIndex !== -1) {
	lines.splice(itLineIndex + 1, 0, ...italianTranslations);
	console.log(`✅ Italian translations added after line ${itLineIndex + 1}`);
} else {
	console.log('❌ Italian insertion point not found');
}

// Add missing German keys (around line 907)
let deLineIndex = -1;
for (let i = 905; i < 910; i++) {
	if (lines[i] && lines[i].includes("de: withOverrides")) {
		deLineIndex = i;
		break;
	}
}

if (deLineIndex !== -1) {
	lines.splice(deLineIndex + 1, 0, "\t\toptional: 'fakultativ',", "\t\tvegan: 'Vegan',");
	console.log(`✅ German missing keys added after line ${deLineIndex + 1}`);
} else {
	console.log('❌ German insertion point not found');
}

// Write back
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ All translations completed successfully!');
