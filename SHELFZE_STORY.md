## 💡 The Spark of Inspiration

Every great idea begins with a simple observation. Mine came from watching my wife.

Week after week, I noticed the same pattern: my wife would come home from the grocery store with bags full of ingredients for a single meal, despite our refrigerator already being stocked with perfectly good food. At the end of each week, we'd find ourselves throwing away wilted vegetables, expired dairy, and forgotten leftovers.

> _"We have a fridge full of food, yet we're still shopping like it's empty."_

This wasn't just our problem. Studies show that approximately **40% of food produced globally goes to waste**. In mathematical terms, if a household spends \\( \$200 \\) per week on groceries and wastes \\( 40\% \\), that's:

$$ \text{Annual Waste} = 200 \times 0.4 \times 52 = \$4,160 \text{ per year} $$

That realization sparked **Shelfze** — a smart pantry management app designed to eliminate food waste by making it effortless to know what you have and when it expires.

## 📚 What I Learned

Building Shelfze was a masterclass in modern app development:

- **React Native & Expo** — Cross-platform development that works on iOS, Android, and Web from a single codebase
- **Google Gemini 2.5 Flash AI** — Leveraging cutting-edge AI for food recognition, expiry date detection via OCR, and intelligent recipe generation
- **Firebase Ecosystem** — Real-time database synchronization with Firestore, authentication flows, and Cloud Functions for serverless backend logic
- **RevenueCat Integration** — Managing subscription-based monetization across platforms
- **Multilingual Support** — Building an app that speaks to users in 6+ languages

## 🔧 How I Built It

### The Architecture

```
Mobile/Web App → Cloud Functions → Gemini AI / Vision API → Firestore
```

### Key Features Developed

1. **AI-Powered Scanning** — Dual capture modes (photo & video) with intelligent multi-item detection
2. **Smart Pantry Management** — Auto-sorting by expiration, color-coded status indicators
3. **Recipe Generation** — AI creates recipes using _only_ the ingredients in your pantry
4. **Household Sharing** — Families can share pantries, shopping lists, and pooled credits
5. **Shopping List** — Seamlessly integrated with recipe missing ingredients

## 🧗 Challenges Faced

| Challenge | Solution |
|-----------|----------|
| Accurate food recognition | Implemented fallback hierarchy: Gemini AI → Cloud Vision API |
| Expiry date OCR in multiple formats | Trained prompts to handle DD/MM/YYYY, MM/YYYY, and localized formats |
| Cross-platform consistency | Used Expo's managed workflow with platform-specific adaptations |
| Real-time sync conflicts | Firestore transactions and optimistic UI updates |

The biggest lesson? **AI is powerful but imperfect.** Building robust fallback systems and user-friendly editing interfaces made the difference between a frustrating app and a delightful one.

## 🚀 What's Next for Shelfze

### 📖 Digitizing Handwritten Recipes

Many of us have treasured family recipes — scribbled on index cards, tucked into old cookbooks, or passed down through generations on stained paper.

**The idea is to integrate a solution that turns all handwritten recipes into a digital version**, which is already available on Shelfze.

Imagine pointing your camera at grandma's famous pasta sauce recipe and instantly:

- Having it digitized and stored
- Cross-referenced with your current pantry
- Missing ingredients automatically added to your shopping list

This feature would bridge the gap between cherished traditions and modern convenience — ensuring no family recipe is ever lost.

## 🙏 Final Thoughts

Shelfze started with a simple frustration: watching good food go to waste. It evolved into a mission to help families everywhere **eat smarter, waste less, and rediscover the joy of cooking with what they have**.

To my wife — thank you for the inspiration. Every feature in this app exists because of those grocery trips and the bins full of forgotten food that sparked this idea.

---

_Built with ❤️ and a lot of leftovers._
