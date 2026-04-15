# 🧠 Module IA (Machine Learning) - Analyse des Risques Clients

Ce document présente l'architecture de notre modèle d'intelligence artificielle intégré nativement au sein de notre environnement **NestJS**.

## 🚀 1. Pourquoi TensorFlow.js ? (L'alternative au Python)
Historiquement, les modèles de Machine Learning exigent un écosystème Python complexe (fichiers `requirements.txt`, scripts `Flask/FastAPI`). 
Pour ce projet SaaS, nous avons pris l’excellente décision d'utiliser **TensorFlow.js (`@tensorflow/tfjs`)**, la librairie officielle de Google pour le JavaScript. 

Cette approche "Server-Side ML" permet de :
- Ne pas construire de second serveur (API unique).
- Avoir un modèle **100% natif Node.js**, entraîné et invoqué directement depuis le cœur de notre logique applicative NestJS.
- Gérer l'entraînement en mémoire directement sans DevOps complexe.

*Les "requirements" habituels de Python ont donc été remplacés de façon moderne avec notre gestionnaire NPM (`package.json > dependencies`).*

## 🧬 2. L'Architecture du Réseau de Neurones
Notre réseau (`ai.model.ts`) repose sur une architecture profonde séquentielle (`tf.sequential`) qui gère la prédiction via la résolution de régressions non linéaires :

- **Réseau (Deep Learning Layer)** :
  - **Couche d'entrée** (Input Shape) : Extraction de nos 3 caractéristiques (Features) financières essentielles de chaque client :
    1. Taux d'impayés (`unpaidRatio`).
    2. Taux de retard de paiement (`lateRatio`).
    3. Taux d'endettement d'affaire (`debtRatio`).
  - **Couche Cachée (Hidden Layer)** : Composée de `16 Unités` (neurones) employant la fonction d'activation **ReLu** (`Rectified Linear Unit`).
  - **Couche de Sortie (Output Layer)** : Employant la fonction d'activation **Sigmoïde**, garantissant que le réseau crachera obligatoirement une valeur encadrée entre `[0, 1]` afin de représenter notre "Score de Risque de Faillite/Défaut".

- **Compilation** :
  - L'Optimiseur `Adam` est sollicité avec un learning-rate ciblé pour empêcher un ajustement trop lent.
  - La fonction de perte est `Mean Squared Error` (MSE) combinée avec la métrique `Mean Absolute Error` (MAE).

## 🔄 3. L'Auto-Entraînement Dynamique (Training Loop)
Vu notre étape de développement (et l'absence momentanée d'une Data Warehouse historique massive de vrais comportements clients à risques), le backend intègre un algorithme de génération de données synthétiques financières (`generateSyntheticData()`).

**Fonctionnement de l'entrainement (On-the-fly) :**
A chaque démarrage du serveur NestJS (`OnModuleInit`), l'IA accomplit un effort d'entraînement local de quelques secondes (`Model.fit`):
1. Elle génère 1000 scénarios financiers client artificiels.
2. Elle exécute **50 Epochs (Générations)** intensives.
3. Le score "Loss" affiché sur la console indique son amélioration d'apprentissage progressive.

## 🤝 4. Explainable AI (XAI)
Pour l'aspect "Intelligence Fonctionnelle" UX/Dashboard pour nos utilisateurs :
- Une fois que TensorFlow a craché la probabilité brute `model.predictScore()` (le Score de Risque entre 0% et 100%), l'API réintègre un jugement sémantique humain (Déterminisme conditionnel : `LOW`, `MEDIUM`, `HIGH`) incluant une raison textuelle (_"Frequent late payments"_).
- Cette pratique appartient au domaine de la *"Explainable AI (IA Explicable)"* visant à vulgariser une décision purement mathématique (la boîte noire TensorFlow) en une recommandation claire et actionnable pour nos gestionnaires clients SaaS.

## 📊 5. Classification des statuts de factures pour le Modèle IA
Pour évaluer le risque, notre modèle classifie les factures (`invoices`) du client selon leurs statuts de cycle de vie :

1. **Factures Payées (`paid`)** : Représentent la bonne santé du client. Elles augmentent le ratio positif et diminuent le taux d'impayés.
2. **Factures En Retard (`overdue`)** : Indicateur critique de risque (`lateRatio`). C'est le signal d'alarme le plus important qui déclenchera généralement une évaluation de risque `HIGH`.
3. **Factures Impayées (Autres Statuts : `draft`, `sent`, `viewed`)** : Entrent dans le calcul global du ratio d'impayés (`unpaidRatio`). Utilisées pour surveiller les clients qui accumulent trop de créances en attente par rapport à leur rythme de paiement.
4. **Factures Annulées (`cancelled`)** : Sont généralement filtrées ou impactent métaphoriquement l'engagement financier inachevé.

Cette classification permet de transformer des statuts métiers en vecteurs mathématiques (Taux) acceptés par le réseau `TensorFlow`.

## 🧪 6. Exemples de Scénarios (LOW, MEDIUM, HIGH)

En explorant le code d'entraînement de l'IA (`ai.model.ts`), on observe la pondération théorique que le réseau va chercher à apprendre : `(0.5 * Taux Impayés) + (0.3 * Taux Retards) + (0.2 * Taux Dettes)`.

L'algorithme de classification (`ai.service.ts`) pose ensuite ses jalons :
- Risque **HIGH** : Score ≥ 70%
- Risque **MEDIUM** : Score ≥ 40%
- Risque **LOW** : Score < 40%

Voici 3 exemples concrets ingérés par notre IA :

### 🟢 Cas LOW (Risque Faible) : Le "Bon Client"
- **Données :** 10 factures au total. 9 sont payées (`paid`), 1 est émise mais non échue (`sent`). Aucune dette majeure.
  - `unpaidRatio` : 10% (0.1)
  - `lateRatio` : 0% (0.0)
  - `debtRatio` : 5% (0.05)
- **Prédiction IA brute :** ~ `(0.5 * 0.1) + (0.3 * 0) + (0.2 * 0.05)` = **0.06** (Score de 6%)
- **Résultat UX :** Statut **`LOW`**. 
- **Explication (XAI) :** _"Client is reliable"_ (Client fiable).

### 🟠 Cas MEDIUM (Risque Modéré) : "Attention aux Décaissements"
- **Données :** Le client compte 60% de factures hors délais (`overdue`). L'endettement commence à paraître substantiel face au chiffre moyen contracté.
  - `unpaidRatio` : 40% (0.4)
  - `lateRatio` : 60% (0.6)
  - `debtRatio` : 40% (0.4)
- **Prédiction IA brute :** ~ `(0.5 * 0.4) + (0.3 * 0.6) + (0.2 * 0.4)` = **0.46** (Score de 46%)
- **Résultat UX :** Statut **`MEDIUM`** (car >= 40%).
- **Explication (XAI) :** _"Frequent late payments"_ (Paiements en retards fréquents repérés par les règles d'explicabilité).

### 🔴 Cas HIGH (Risque Élevé / Critique) : "Possibilité de Faillite"
- **Données :** Ratio d'impayés énorme (La majorité des factures sont des relances empilées et expirées). L'endettement écrase le chiffre d'affaire estimé.
  - `unpaidRatio` : 80% (0.8)
  - `lateRatio` : 90% (0.9)
  - `debtRatio` : 60% (0.6)
- **Prédiction IA brute :** ~ `(0.5 * 0.8) + (0.3 * 0.9) + (0.2 * 0.6)` = **0.79** (Score de 79%)
- **Résultat UX :** Statut **`HIGH`** (car >= 70%).
- **Explication (XAI) :** L'algorithme d'explicabilité va isoler le poids fort en pointant _"High unpaid balance compared to revenue"_ ou _"Frequent late payments"_ prioritairement pour alerter le SaaS manager.

## 🛠️ 7. Comment tester tous les cas possibles depuis le Frontend ?

L'architecture financière du backend (`clients.service.ts`) ne permet pas d'éditer le Chiffre d'Affaire ou la Dette manuellement lors de la création d'un profil. **Ces données sont calculées dynamiquement selon les factures existantes**.
Pour simuler les scores, testez avec la méthode suivante sur votre dashboard :

### 🟢 Test 1 : Déclencher le score LOW
1. Allez dans l'onglet **"Clients"** et créez un nouveau client (ex: "Client Fiable SA").
2. Allez dans le module **"Factures (Invoices)"** et créez-lui plusieurs factures (ex: 5 factures avec des montants assez élevés pour générer du revenu).
3. Marquez manuellement **la quasi-totalité de ces factures comme "Paid" (Payées)** (ex: 4 sur 5).
4. Le calcul de la dette en base chutera à quasi 0 par rapport aux revenus.
5. Résultat : L'IA Frontend calculera un risque très faible (Score < 40%) et affichera **LOW**.

### 🟠 Test 2 : Déclencher le score MEDIUM
1. Créez un second client (ex: "Client Retardataire LLC").
2. Créez une dizaine de factures cumulées.
3. Astuce de test : Passez environ **60% des factures avec le statut "Overdue" (En retard)**. Mettez le reste en statut "Paid".
4. Le nombre important de retards alertera le TensorFlow `lateRatio`.
5. Résultat sur l'interface : Le curseur basculera sur **MEDIUM** (entre 40% et 69%). L'explicabilité (XAI) pointera les fréquents retards ("Frequent late payments").

### 🔴 Test 3 : Déclencher le score HIGH
1. Créez un troisième client (ex: "Client Risque Faillite").
2. Générez-lui plusieurs factures avec des montants élevés pour gonfler le montant global dû.
3. Surtout **ne mettez aucune facture en "Paid"**, et passez la plus grande majorité en **"Overdue"** (ex: 9 sur 10 factures).
4. Cette action va générer automatiquement un indicateur d'endettement maximal (Outstanding Balance = Total Revenue) sans aucun historique de remboursement, combiné à des dates d'échéances expirées.
5. Observez le Dashboard IA Frontend : L'interface clignotera au rouge avec une alerte **HIGH RISK** (Score > 70%).
