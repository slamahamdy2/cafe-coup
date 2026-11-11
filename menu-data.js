/* القائمة الأصلية للمنيو — تُستخدم إذا لم تُحفظ قائمة من لوحة صاحب المقهى بعد.
   بعد أول حفظ من اللوحة (admin.html) تصبح القائمة المحفوظة هي المعتمدة. */
window.COUP_DEFAULT = {
  gamesPassPrice: 200,
  items: [
  { id:"iced-latte", section:"drinks", name_ar:"آيس لاتيه", name_fr:"Latte glacé",
    desc_ar:"إسبريسو مزدوج مع حليب بارد وثلج", desc_fr:"Double espresso, lait frais et glaçons", price:120, image:"images/iced-latte.png" },
  { id:"iced-mocha", section:"drinks", name_ar:"آيس موكا", name_fr:"Moka glacé",
    desc_ar:"شوكولاتة داكنة، إسبريسو وحليب بارد", desc_fr:"Chocolat noir, espresso et lait froid", price:140, image:"images/iced-mocha.png" },
  { id:"iced-americano", section:"drinks", name_ar:"آيس أمريكانو", name_fr:"Americano glacé",
    desc_ar:"إسبريسو مركّز مع ماء بارد وثلج", desc_fr:"Espresso allongé sur glace", price:100, image:"images/iced-americano.png" },
  { id:"mojito", section:"drinks", name_ar:"موهيتو", name_fr:"Mojito",
    desc_ar:"نعناع طازج، ليمون أخضر وصودا", desc_fr:"Menthe fraîche, citron vert et soda", price:110, image:"images/mojito.png" },
  { id:"blue-lemonade", section:"drinks", name_ar:"ليموناضة زرقاء", name_fr:"Limonade bleue",
    desc_ar:"ليمون، توت أزرق وصودا منعشة", desc_fr:"Citron, myrtilles et soda pétillant", price:120, image:"images/blue-lemonade.png" },
  { id:"mango", section:"drinks", name_ar:"عصير مانجو", name_fr:"Jus de mangue",
    desc_ar:"مانجو طازجة مخفوقة مع قطع الفاكهة", desc_fr:"Mangue fraîche mixée, morceaux de fruit", price:100, image:"images/mango.png" },
  { id:"banana-milk", section:"drinks", name_ar:"حليب بالموز", name_fr:"Lait banane",
    desc_ar:"موز طازج مخفوق مع الحليب البارد", desc_fr:"Banane fraîche mixée au lait froid", price:90, image:"images/banana-milk.png" },

  // ── الطعام ──
  { id:"chocolate-cake", section:"food", name_ar:"كيك الشوكولاتة", name_fr:"Gâteau au chocolat",
    desc_ar:"ثلاث طبقات من الكيك مع كريمة الشوكولاتة", desc_fr:"Trois couches de gâteau, crème au chocolat", price:150, image:"images/chocolate-cake.png" },
  { id:"chicken-wrap", section:"food", name_ar:"راب الدجاج", name_fr:"Wrap au poulet",
    desc_ar:"دجاج، بطاطس وصوص في خبز تورتيلا مشوي", desc_fr:"Poulet, frites et sauce dans une tortilla grillée", price:180, image:"images/chicken-wrap.png" },
  { id:"club-sandwich", section:"food", name_ar:"كلوب ساندويتش", name_fr:"Club sandwich",
    desc_ar:"خبز محمّص، جبن، طماطم وخس", desc_fr:"Pain toasté, fromage, tomate et salade", price:200, image:"images/club-sandwich.png" },

  // ── الألعاب ──
  { id:"uno", section:"games", name_ar:"أونو", name_fr:"UNO",
    desc_ar:"لعبة الورق الملوّنة، من 2 إلى 10 لاعبين", desc_fr:"Le jeu de cartes coloré, de 2 à 10 joueurs", image:"images/uno.png" },
  { id:"monopoly", section:"games", name_ar:"مونوبولي", name_fr:"Monopoly",
    desc_ar:"اشترِ وبِع العقارات وكُن الأغنى", desc_fr:"Achetez, vendez et devenez le plus riche", image:"images/monopoly.png" },
  { id:"jenga", section:"games", name_ar:"برج الخشب", name_fr:"Tour en bois",
    desc_ar:"اسحب القطعة دون أن يسقط البرج", desc_fr:"Retirez un bloc sans faire tomber la tour", image:"images/jenga.png" },
  { id:"chess", section:"games", name_ar:"شطرنج", name_fr:"Échecs",
    desc_ar:"مباراة هادئة بين لاعبَين", desc_fr:"Une partie tranquille à deux", image:"images/chess.png" },
  { id:"hedbanz", section:"games", name_ar:"هيدبانز", name_fr:"Hedbanz",
    desc_ar:"خمّن ما على رأسك بالأسئلة", desc_fr:"Devinez ce qui est sur votre tête", image:"images/hedbanz.png" },
  { id:"cockroach-poker", section:"games", name_ar:"بوكر الصراصير", name_fr:"Poker des cafards",
    desc_ar:"خادِع خصمك بالبطاقات واكشف من يكذب", desc_fr:"Bluffez avec vos cartes et démasquez les menteurs", image:"images/cockroach-poker.png" },
  { id:"loups-garous", section:"games", name_ar:"المستذئبون", name_fr:"Loups-Garous",
    desc_ar:"لعبة جماعية: اكتشف المستذئبين بين اللاعبين", desc_fr:"Jeu de groupe : démasquez les loups-garous", image:"images/loups-garous.png" },
  { id:"coup-game", section:"games", name_ar:"كو", name_fr:"Coup",
    desc_ar:"هويات سرية، خداع وذكاء", desc_fr:"Identités secrètes, bluff et déduction", image:"images/coup-game.png" },
  { id:"playing-cards", section:"games", name_ar:"ورق اللعب", name_fr:"Cartes à jouer",
    desc_ar:"كوتشينة كلاسيكية لكل ألعابك المفضّلة", desc_fr:"Un jeu de cartes classique pour toutes vos parties", image:"images/playing-cards.png" },
]
};
