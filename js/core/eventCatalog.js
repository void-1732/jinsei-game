/** STEP 46: original, age-appropriate and context-dependent life-event catalog.
 * Event definitions are plain data; the same data is used by Node tests and the browser.
 * Financial costs are only offered when the player can afford every option.
 */
const C=[];
const O=(label,result,impact)=>({label,result,impact});
const S=(tag,min,max,rows)=>{for(const r of rows){const [id,title,description,a,b,c,when]=r;C.push({id,tag,min,max,title,description,options:[a,b,c],when:when??null});}};
const p=(label,result,impact)=>O(label,result,impact);

S('はじめての世界',0,2,[
 ['baby-picture','はじめての絵本','色とりどりの絵に目が釘付け。',p('もう一度読んでもらう','好きな絵を指させた。',{study:2,social:2}),p('絵をまねて描く','初めての線を描いた。',{study:2,mental:2}),p('少し眠る','安心して眠れた。',{energy:6})],
 ['baby-song','音楽の時間','部屋で楽しそうな音楽が流れている。',p('リズムに合わせて動く','体を動かす楽しさを知った。',{physical:3,energy:-1}),p('歌を聴き続ける','心地よい音に包まれた。',{mental:4}),p('家族の手を握る','温かさが伝わった。',{social:3,mental:1})],
 ['baby-park','公園の新しい道','いつもと違う道に何があるだろう。',p('草花を見る','小さな発見に目を輝かせた。',{study:2,mental:2}),p('よちよち歩く','足腰が少し強くなった。',{physical:4,energy:-2}),p('抱っこしてもらう','家族とゆっくり過ごした。',{social:3,energy:3})],
 ['baby-block','積み木が崩れた','高く積んだ積み木が音を立てて崩れた。',p('もう一度積む','形を考えるのが楽しくなった。',{study:3}),p('新しい形に並べる','自分だけの遊びを発見した。',{mental:2,study:1}),p('家族と一緒に遊ぶ','笑いながら完成させた。',{social:3})],
 ['baby-weather','窓の外は雨','雨粒が窓を流れていく。',p('雨の音に耳をすます','落ち着いて過ごせた。',{mental:4}),p('窓に絵を描く','想像力が広がった。',{study:2,mental:1}),p('布団で休む','元気を取り戻した。',{energy:5})],
 ['baby-firstword','ことばの発見','新しいことばを聞いた。',p('繰り返して言う','発音できることばが増えた。',{study:3}),p('身振りで伝える','思いが通じてうれしかった。',{social:3}),p('静かに聞く','たくさんのことばを覚えた。',{study:2,mental:1})],
 ['baby-animal','小さな動物','公園で小さな動物を見かけた。',p('そっと観察する','生き物への好奇心が芽生えた。',{study:3}),p('近くで家族と見守る','命を大切にする気持ちが育った。',{social:3}),p('別の生き物も探す','元気に歩き回った。',{physical:2,energy:-2})],
 ['baby-meal','新しい味','いつもと違う料理が食卓に並んだ。',p('ひと口食べてみる','新しい味を知った。',{physical:2,mental:1}),p('家族と分ける','楽しい食事になった。',{social:3}),p('ゆっくり味わう','満足できた。',{energy:3})],
 ['baby-toy','お気に入りが見つからない','遊びたいおもちゃが見当たらない。',p('一緒に探す','探し方を覚えた。',{study:2,social:2}),p('代わりの遊びを考える','新しい遊びを作った。',{study:3}),p('少し休んで待つ','落ち着いて気持ちを整えた。',{mental:3})],
 ['baby-visitor','家にお客さん','知らない人が遊びに来た。',p('あいさつしてみる','人と接する自信がついた。',{social:4}),p('家族のそばにいる','安心して過ごせた。',{mental:4}),p('絵本を見せる','大好きなものを伝えられた。',{social:2,study:1})],
]);
S('幼少期',3,5,[
 ['child-kites','風の強い日','外で風が勢いよく吹いている。',p('たこを作る','工夫しながら形を作った。',{study:3}),p('外で走り回る','気持ちよく体を動かした。',{physical:4,energy:-3}),p('風の音を楽しむ','穏やかな気分になった。',{mental:3})],
 ['child-sharing','おもちゃの順番','遊びたいおもちゃを友だちも使いたがっている。',p('順番を決める','納得して一緒に遊べた。',{social:4,study:1}),p('別の遊びに誘う','新しい遊びを思いついた。',{study:3,social:1}),p('自分の気持ちを伝える','伝える勇気が生まれた。',{mental:3,social:-1})],
 ['child-garden','庭の小さな畑','野菜の芽が出てきた。',p('毎日観察する','成長の仕組みに興味を持った。',{study:4}),p('水やりを手伝う','家族から感謝された。',{social:3,physical:1}),p('絵に記録する','小さな記録ができた。',{skill:'読書',skillValue:2,mental:2})],
 ['child-festival','近所のお祭り','にぎやかな音が聞こえてくる。',p('輪に入って遊ぶ','新しい友だちと知り合った。',{social:4,energy:-3}),p('屋台の手伝いを見る','地域の仕事に関心が湧いた。',{study:3}),p('家族と見て回る','楽しい時間を過ごした。',{mental:3,social:1})],
 ['child-puzzle','難しいパズル','最後の一枚がなかなかはまらない。',p('粘り強く考える','完成したとき大きな達成感を得た。',{study:4,energy:-2}),p('家族にヒントを聞く','力を合わせることを覚えた。',{social:3,study:1}),p('一度休む','気分を切り替えた。',{energy:3,mental:1})],
 ['child-lost','知らない道','散歩中に見慣れない場所へ来た。',p('大人に確認する','安全に帰る方法を覚えた。',{study:3,social:2}),p('目印を探す','周囲を注意深く見られた。',{study:4}),p('落ち着いて待つ','慌てずにすんだ。',{mental:4})],
 ['child-race','はじめてのかけっこ','走る順番がやって来た。',p('全力で走る','最後まで走り切った。',{physical:5,energy:-4}),p('友だちを応援する','相手が笑顔になった。',{social:4}),p('自分のペースで走る','楽しんで参加できた。',{physical:2,mental:2})],
 ['child-story','物語の続きを考える','読んでもらったお話の結末が気になる。',p('続きを作って話す','想像力が伸びた。',{study:3,mental:2}),p('新しい本を探す','読書が好きになった。',{skill:'読書',skillValue:4}),p('家族の考えを聞く','違う視点を知った。',{social:3,study:1})],
 ['child-mistake','壊してしまった','遊んでいた道具を誤って壊してしまった。',p('正直に話す','誠実さの大切さを学んだ。',{mental:4,social:2}),p('一緒に直す','工夫して修理した。',{study:3,energy:-2}),p('今後の使い方を考える','丁寧に扱うことを覚えた。',{study:2,mental:2})],
 ['child-swim','水辺の約束','水遊びに誘われた。',p('大人と安全を確認する','安全の大切さを覚えた。',{study:3}),p('浅い場所で遊ぶ','体を動かして楽しんだ。',{physical:3,energy:-2}),p('日陰で休む','無理なく過ごせた。',{energy:4})],
]);
S('小学生',6,11,[
 ['elem-library','図書室の新刊','新しい本が図書室に届いた。',p('科学の本を借りる','身近な疑問が増えた。',{study:4}),p('物語を読む','言葉の世界が広がった。',{skill:'読書',skillValue:4}),p('友だちに薦める','好きな本で話が弾んだ。',{social:3})],
 ['elem-field','校庭のチーム分け','体育の授業でチームを決める。',p('得意な役目を引き受ける','自信を持って動けた。',{physical:3,mental:2}),p('みんなの意見を聞く','協力する力が育った。',{social:4}),p('新しい競技に挑む','運動の幅が広がった。',{skill:'運動',skillValue:4,energy:-2})],
 ['elem-math','算数の難問','いつもと違う難しい問題が出された。',p('最後まで解く','考える力が伸びた。',{study:5,energy:-3}),p('友だちと考える','一緒に理解が深まった。',{study:3,social:2}),p('先生に質問する','わからないことを聞けた。',{study:3,mental:1})],
 ['elem-cleanup','教室の片付け','掃除の時間に手が足りていない。',p('率先して手伝う','みんなに感謝された。',{social:4,energy:-2}),p('分担表を作る','段取りの大切さを学んだ。',{study:3,social:1}),p('自分の持ち場を丁寧に','責任を果たせた。',{mental:3})],
 ['elem-science','理科の観察','不思議な現象を見つけた。',p('理由を調べる','探究心が強まった。',{study:5}),p('実験を手伝う','手順を守る経験になった。',{study:3,energy:-1}),p('絵で説明する','人に伝える練習ができた。',{social:2,study:2})],
 ['elem-sportsday','運動会の練習','練習は大変だけれど、本番が近い。',p('走る練習を続ける','少し速くなった。',{skill:'運動',skillValue:5,energy:-4}),p('仲間を励ます','チームの雰囲気が良くなった。',{social:4}),p('よく眠って備える','体調を整えられた。',{energy:5})],
 ['elem-transfer','新しいクラスメート','転校生が一人で座っている。',p('話しかける','新しい友人と話ができた。',{social:5}),p('学校を案内する','案内するうちに仲良くなった。',{social:4,energy:-1}),p('周囲の様子を見守る','落ち着いて接することができた。',{mental:2,study:1})],
 ['elem-report','自由研究の発表','みんなの前で調べたことを説明する日。',p('練習を重ねる','自分の考えを伝えられた。',{study:5,energy:-3}),p('写真を使って説明する','説明が分かりやすくなった。',{skill:'パソコン',skillValue:3,study:2}),p('友だちと共同発表','支え合って発表できた。',{social:4,study:2})],
 ['elem-chores','家のお手伝い','家族が少し忙しそうにしている。',p('料理を手伝う','家族が喜んでくれた。',{social:4}),p('洗濯物を片付ける','責任感を持って取り組めた。',{physical:2,mental:2}),p('時間割を考える','効率よく動けるようになった。',{study:3})],
 ['elem-computer','学校のパソコン','初めて使うソフトウェアに触れる。',p('使い方を調べる','新しい操作を覚えた。',{skill:'パソコン',skillValue:5}),p('友だちに教わる','一緒に作業が進んだ。',{social:3,skill:'パソコン',skillValue:2}),p('作品を作る','小さな作品を完成させた。',{mental:3,skill:'パソコン',skillValue:2})],
 ['elem-lunch','給食当番の日','料理をみんなに配る役目になった。',p('準備を丁寧に進める','段取りよく配ることができた。',{study:2,social:2}),p('困っている子を助ける','感謝されてうれしかった。',{social:4}),p('落ち着いて自分の役割を果たす','焦らずに終えられた。',{mental:3})],
 ['elem-pet','動物を世話する','近所で動物のお世話を頼まれた。',p('食事の時間を守る','責任を持てた。',{study:2,social:2}),p('一緒に遊ぶ','自然と笑顔になった。',{mental:4,energy:-1}),p('飼い方を調べる','命について詳しくなった。',{study:4})],
]);
S('中学生',12,14,[
 ['junior-exam','定期試験が近い','苦手科目をどう克服するか考える。',p('苦手に集中する','苦手分野を克服できた。',{study:5,energy:-4}),p('友だちと勉強会','教え合って理解が進んだ。',{study:3,social:3}),p('休憩を入れて取り組む','集中力を保てた。',{study:2,mental:2})],
 ['junior-club','部活の役割','新しい係を決めることになった。',p('リーダーに立候補','責任を経験した。',{social:4,energy:-3}),p('練習を支える','技術が磨かれた。',{skill:'運動',skillValue:4}),p('計画づくりを担当','段取りを学んだ。',{study:3,social:1})],
 ['junior-conflict','友だちとの行き違い','軽い誤解から気まずくなってしまった。',p('直接話し合う','お互いの気持ちが分かった。',{social:5,mental:-1}),p('少し時間を置く','冷静に考えられた。',{mental:3}),p('第三者に相談する','別の見方を知った。',{social:3,mental:2})],
 ['junior-culture','文化祭の準備','学年で企画をまとめることになった。',p('作品づくりを引き受ける','新しい表現を試した。',{study:3,energy:-3}),p('広報を担当する','人前で話す練習になった。',{social:4}),p('調整役になる','周りをまとめられた。',{social:3,study:2})],
 ['junior-mentor','後輩が困っている','後輩が練習についていけず悩んでいる。',p('基本から教える','丁寧に教える経験になった。',{social:5}),p('一緒に練習する','お互いに成長できた。',{skill:'運動',skillValue:3,social:2}),p('先生に協力を頼む','支える方法を学んだ。',{study:2,social:2})],
 ['junior-net','ネット上のうわさ','友だちについて未確認の話が広がっている。',p('拡散せずに確認する','確かな情報を大切にした。',{study:3,mental:2}),p('本人を支える','信頼を深められた。',{social:4}),p('先生に相談する','安全な対応を学んだ。',{study:2,social:2})],
 ['junior-future','進路調査票','希望する進路を初めて書くことになった。',p('興味を調べる','将来の選択肢を知った。',{study:4}),p('家族と話す','大切にしたいことが見えた。',{social:3,mental:2}),p('先輩に聞く','経験者の話を聞けた。',{social:2,study:2})],
 ['junior-volunteer','地域清掃の日','地域で清掃活動を募集している。',p('仲間と参加する','誰かの役に立てた。',{social:4,physical:2}),p('広報ポスターを作る','地域に活動を伝えた。',{study:3}),p('道具の整理をする','協力の大切さを感じた。',{social:3})],
 ['junior-injury','足をひねった','体育の授業で軽く足をひねった。',p('無理せず休む','早めに回復へ向かえた。',{energy:4,physical:-2}),p('先生に相談する','適切に対応できた。',{study:2,physical:-1}),p('見学して応援する','仲間を励ませた。',{social:3,physical:-3})],
 ['junior-competition','大会の予選','思いのほか強い相手と対戦することになった。',p('練習の成果を試す','集中して取り組めた。',{skill:'運動',skillValue:4,energy:-4}),p('作戦を考える','判断力が鍛えられた。',{study:3}),p('仲間を支える','チームの信頼が深まった。',{social:4})],
 ['junior-poetry','作文コンクール','テーマは「大切なもの」。どんな作品にする？',p('自分の経験を書く','表現する力が伸びた。',{skill:'読書',skillValue:4}),p('家族に話を聞く','新しい視点が得られた。',{social:3,study:1}),p('資料を調べてまとめる','調べる力が身についた。',{study:4})],
 ['junior-time','放課後の一時間','今日は自由に使える時間が少しだけある。',p('予習を進める','少し先の内容を理解できた。',{study:3,energy:-2}),p('友だちと話す','悩みを共有できた。',{social:3,mental:2}),p('運動して切り替える','気分転換になった。',{physical:3,energy:-2})],
]);
S('高校生',15,17,[
 ['high-course','文理選択の相談','次の学年の学習コースを考える時期になった。',p('得意科目を伸ばす','強みが明確になった。',{study:5,energy:-3}),p('不得意科目を補う','苦手への抵抗が減った。',{study:3,mental:2}),p('先生と話し合う','将来の選択肢を整理できた。',{social:2,study:2})],
 ['high-exam','模試の結果','期待した結果ではなかった。',p('間違いを分析する','勉強の方法を見直せた。',{study:5,mental:-1}),p('計画を立て直す','落ち着いて次に備えられた。',{study:3,mental:2}),p('先生に相談する','改善点が見えてきた。',{social:2,study:3})],
 ['high-bunkasai','文化祭の出し物','企画を決める話し合いが始まった。',p('企画を提案する','アイデアが採用された。',{study:3,social:2}),p('制作を担当する','完成までやり切った。',{skill:'パソコン',skillValue:3,energy:-3}),p('当日の運営を引き受ける','仲間との連携を学んだ。',{social:4})],
 ['high-parttime','アルバイトへの関心','学校と両立できる働き方を考えている。',p('求人や規則を調べる','働く前の準備ができた。',{study:3}),p('勉強時間を守る','優先順位を決められた。',{study:4,energy:-2}),p('家族と相談する','生活の見通しを立てられた。',{social:3,mental:1})],
 ['high-friend','親友の進路','親友が遠くの学校を目指している。',p('背中を押す','互いに応援し合えた。',{social:4}),p('自分の希望を伝える','正直に話せた。',{mental:3,social:1}),p('一緒に情報を集める','進路の選択肢が広がった。',{study:3,social:2})],
 ['high-volunteer','学外活動の誘い','地域のボランティア募集を見つけた。',p('参加してみる','知らない人と協力できた。',{social:5,energy:-2}),p('企画を手伝う','段取りの経験が増えた。',{study:3,social:1}),p('試験準備を優先','目標への時間を確保した。',{study:4})],
 ['high-speech','発表会の代表','発表会の代表候補になった。',p('挑戦する','大勢の前で話せた。',{social:3,study:3,energy:-3}),p('友人と共同発表','分担して成功させた。',{social:4,study:1}),p('裏方を支える','チームを支えられた。',{social:3,mental:2})],
 ['high-investigation','進学費用の調査','希望の進路に必要な費用を調べ始めた。',p('奨学金を調べる','制度を理解できた。',{study:4}),p('家族と資金計画を話す','現実的な見通しを立てた。',{social:2,study:2}),p('別の進路も比較する','選択肢を広げられた。',{study:3,mental:1})],
 ['high-wellness','眠れない試験前夜','大きな試験を前に緊張が続く。',p('早めに休む','休息を取れた。',{energy:5,mental:3}),p('短時間だけ確認する','要点を整理できた。',{study:3,energy:-2}),p('友人に相談する','緊張を分かち合えた。',{social:3,mental:2})],
 ['high-tech','オンライン作品発表','作った作品を公開する機会が来た。',p('技術を磨く','使えるツールが増えた。',{skill:'パソコン',skillValue:5,energy:-2}),p('感想を募る','改善につながる意見を得た。',{social:3,study:2}),p('発表を見送って直す','完成度を上げられた。',{study:3,mental:1})],
 ['high-crisis','チーム内の衝突','意見の違いで準備が止まってしまった。',p('双方の話を聞く','折り合いをつけられた。',{social:5,energy:-2}),p('作業を整理する','やることが明確になった。',{study:3}),p('一度距離を置く','気持ちを整えた。',{mental:4,social:-1})],
 ['high-visit','オープンキャンパス','複数の進路先を見学する機会がある。',p('授業を体験する','進学後を想像できた。',{study:4}),p('先輩に質問する','現実的な話を聞けた。',{social:3,study:1}),p('就職先の情報も探す','選択肢を広く考えられた。',{study:3,mental:1})],
]);
S('自立への一歩',18,24,[
 ['young-firstbudget','初めての家計簿','自由に使えるお金と支出を把握したい。',p('固定費を書き出す','支出が見えるようになった。',{study:3,mental:2}),p('生活費を優先する','無理のない計画を立てた。',{mental:4}),p('経験者に相談する','生活の知恵を得た。',{social:3,study:1})],
 ['young-network','新しい人たち','知らない人の多い環境に入った。',p('自分からあいさつする','新しい輪に入れた。',{social:5}),p('共通の趣味を探す','話題を見つけられた。',{social:3,mental:2}),p('観察してから関わる','落ち着いて環境に慣れた。',{mental:3,study:1})],
 ['young-failure','初めての大きな失敗','予定していたことがうまくいかなかった。',p('原因を整理する','次に生かせる経験になった。',{study:4,mental:-1}),p('助けを求める','頼れる人が見つかった。',{social:4,mental:1}),p('休んで立て直す','気力が回復した。',{energy:5,mental:2})],
 ['young-interview','面接の練習','進路のために自己紹介の練習をする。',p('経験を言語化する','自分の強みが分かった。',{study:4}),p('友だちと模擬面接','伝える自信がついた。',{social:4}),p('礼儀と準備を見直す','緊張を減らせた。',{mental:3,study:1})],
 ['young-romance','気になる人との出会い','趣味の場で気の合いそうな人と話した。',p('共通点を探して話す','自然に会話が弾んだ。',{social:4,mental:2}),p('焦らず友人として接する','落ち着いた関係を大切にした。',{social:3,mental:2}),p('自分の目標を優先する','やりたいことが進んだ。',{study:3,mental:1})],
 ['young-rental','住まいを考える','新生活の住まいについて悩んでいる。',p('家賃相場を調べる','生活費の見通しが立った。',{study:3}),p('交通や環境を比較する','優先順位が明確になった。',{study:2,mental:2}),p('家族に相談する','大事な視点に気づけた。',{social:3})],
 ['young-cert','資格講座の案内','新しい技能を学ぶ案内が届いた。',p('無料教材から始める','基礎を学べた。',{skill:'パソコン',skillValue:4,energy:-2}),p('勉強会を探す','仲間と学べた。',{study:3,social:2}),p('まず計画を立てる','無理なく継続できそうだ。',{mental:2,study:2})],
 ['young-city','知らない街で迷う','約束の時間が迫る中、道を間違えた。',p('地図で調べる','落ち着いて到着できた。',{study:3,mental:1}),p('通行人に尋ねる','親切に教えてもらえた。',{social:3}),p('一度休んで再確認','焦らずに動けた。',{mental:3,energy:1})],
 ['young-balance','予定が重なった','勉強・仕事・友人の約束が同じ週に集中した。',p('優先順位を決める','やることを絞れた。',{study:3,mental:2}),p('手伝ってもらう','協力して乗り切った。',{social:4,energy:-1}),p('予定を減らして休む','体調を整えられた。',{energy:6,mental:2})],
 ['young-hobby','新しい趣味を探す','気分転換になる活動を見つけたい。',p('読書会へ参加','新しい作品に出会った。',{skill:'読書',skillValue:4,social:1}),p('スポーツを始める','体を動かす習慣になった。',{skill:'運動',skillValue:3,physical:2}),p('制作活動に挑む','夢中になれる時間ができた。',{mental:4,skill:'パソコン',skillValue:2})],
 ['young-contract','契約書を読む','手続きに必要な書類を渡された。',p('条件を確認する','重要な点に気づけた。',{study:4}),p('詳しい人に相談','疑問を解消できた。',{social:2,study:2}),p('すぐに決めず持ち帰る','慎重に判断できた。',{mental:3,study:1})],
 ['young-opportunity','思いがけない推薦','活動を見ていた人から次の企画に誘われた。',p('挑戦してみる','新しい経験を積んだ。',{study:3,energy:-4}),p('条件を詳しく聞く','無理のない選択ができた。',{study:2,mental:2}),p('今の活動を大切にする','今できることに集中した。',{mental:3})],
]);
S('仕事と暮らし',25,39,[
 ['adult-presentation','大切なプレゼン','企画を社内で説明する日が来た。',p('資料を磨く','説得力が高まった。',{work:4,energy:-4}),p('同僚と練習する','支え合って発表できた。',{work:2,social:3}),p('論点を絞る','落ち着いて伝えられた。',{study:2,mental:2})],
 ['adult-routine','生活を見直す日','毎日の家事や仕事で時間が足りない。',p('予定を整理する','無駄な時間を減らせた。',{mental:3,study:2}),p('健康の時間を確保する','体の調子が少し良くなった。',{physical:3,energy:2}),p('人に協力を頼む','一人で抱えずに済んだ。',{social:4})],
 ['adult-friend','旧友からの連絡','学生時代の友人から久しぶりに連絡が来た。',p('近況を聞く','友情を確かめ合えた。',{social:5}),p('短いメッセージを返す','無理なくつながりを保てた。',{social:3,mental:1}),p('予定が落ち着いてから連絡する','生活を優先できた。',{energy:2,mental:2})],
 ['adult-healthcheck','健康診断の案内','定期的な健康診断の案内を見た。',p('生活習慣を見直す','健康への意識が高まった。',{physical:4,energy:1}),p('休息を増やす','疲れが少し取れた。',{energy:5}),p('食生活を整える','体調の管理が進んだ。',{physical:3,mental:1})],
 ['adult-housing','住まいの修繕','住まいの小さな不具合を見つけた。',p('手入れ方法を調べる','自分で維持する知識がついた。',{study:3}),p('家族と対応を考える','生活の相談ができた。',{social:3}),p('費用を見積もる','支出の準備ができた。',{study:3,mental:1})],
 ['adult-invention','仕事の改善案','同じ作業に時間がかかっている。',p('改善策を試す','作業が少し効率化した。',{work:4,energy:-3}),p('同僚と検討する','協力して案をまとめた。',{social:4,work:1}),p('記録を分析する','課題を整理できた。',{study:4})],
 ['adult-newskill','新しい技術','仕事でも使える新しい技術が広まっている。',p('教材で学ぶ','基本をつかんだ。',{skill:'パソコン',skillValue:5,energy:-3}),p('経験者に聞く','実務のヒントが得られた。',{work:2,social:2}),p('必要性を見極める','無理なく準備できた。',{study:3,mental:1})],
 ['adult-holiday','貴重な休日','忙しい時期を終えて休日ができた。',p('しっかり休む','元気を取り戻した。',{energy:8,mental:2}),p('家族や友人と話す','大切な時間を過ごした。',{social:5,energy:-1}),p('趣味に集中する','気分を切り替えられた。',{mental:5})],
 ['adult-conflict','意見が分かれた会議','立場の違う人との話し合いが難航している。',p('双方の事情を聞く','調整の経験になった。',{social:4,work:2}),p('数字で説明する','論理的に伝えられた。',{study:3,work:2}),p('一度持ち帰る','慎重に考えられた。',{mental:2,energy:2})],
 ['adult-commute','通勤のトラブル','交通機関に遅れが出ている。',p('別の経路を探す','問題に対応できた。',{study:3,energy:-2}),p('早めに連絡する','周囲に状況を伝えられた。',{social:3,mental:1}),p('安全を優先する','落ち着いて行動できた。',{mental:3})],
 ['adult-future','将来の資金計画','数年後の大きな支出を考えている。',p('収支を見直す','支出の改善点が見えた。',{study:3,mental:2}),p('働き方を見直す','優先順位を整理できた。',{work:2,mental:2}),p('大切な人と相談する','考えを共有できた。',{social:4})],
 ['adult-accident','自転車のヒヤリ','移動中に車と接触しそうになった。',p('安全な道を選び直す','事故を防げた。',{study:2,energy:-2}),p('少し休んで落ち着く','気持ちを整えた。',{mental:3,energy:2}),p('交通ルールを見直す','次の危険に備えた。',{study:4})],
]);
S('人生の転機',40,64,[
 ['mid-mentor','後輩からの相談','経験の浅い仲間が大きな壁にぶつかっている。',p('経験を伝える','後輩に安心感を与えた。',{social:5,work:1}),p('一緒に考える','互いに学びがあった。',{social:3,study:2}),p('見守る','自分で成長する姿を見られた。',{mental:3})],
 ['mid-retraining','新しい勉強','これまでと違う分野に興味が湧いた。',p('本から学び始める','学び直しの第一歩になった。',{skill:'読書',skillValue:4}),p('講座を調べる','新しい道が見えてきた。',{study:4}),p('仲間を探す','学びを共有できた。',{social:4})],
 ['mid-balance','責任が増えた','周囲から頼りにされることが増えた。',p('仕事を分担する','無理のない体制を作れた。',{social:4,work:2}),p('休息の時間を守る','体調を整えた。',{energy:6,mental:2}),p('優先度を見直す','重要なことに集中できた。',{study:3,work:1})],
 ['mid-parents','家族の暮らし','家族の生活状況に変化がありそうだ。',p('話を聞く','今の希望を共有できた。',{social:5}),p('今後の計画を考える','備えを進められた。',{study:3,mental:1}),p('無理のない支え方を探す','負担を分け合えた。',{social:3,mental:2})],
 ['mid-medical','体調の変化','最近、疲れを感じる日が増えている。',p('休養を増やす','疲れが取れた。',{energy:7}),p('散歩を習慣にする','無理なく動く時間を作った。',{physical:4,energy:-1}),p('生活を記録する','体調の傾向に気づけた。',{study:3,mental:1})],
 ['mid-community','地域の集まり','近所で交流会が開かれる。',p('参加してみる','新しいつながりができた。',{social:5}),p('運営を手伝う','役立つ仕事ができた。',{social:3,energy:-2}),p('案内を作る','地域に情報を届けた。',{skill:'パソコン',skillValue:3})],
 ['mid-hobby','昔の趣味','以前好きだった活動を思い出した。',p('もう一度挑む','楽しさを再発見できた。',{mental:5,energy:-2}),p('友だちを誘う','話題が広がった。',{social:5}),p('記録を整理する','昔の経験を振り返った。',{study:3,mental:2})],
 ['mid-workstyle','働き方の見直し','今の生活と仕事のバランスを考えている。',p('仕事を効率化する','時間を作れるようになった。',{work:3,energy:-2}),p('家庭の予定を優先する','家で落ち着いて過ごせた。',{social:3,mental:2}),p('今後の準備を始める','次の段階が見えてきた。',{study:3})],
 ['mid-renewal','役割の変化','長く続けた役割を後任へ引き継ぐことになった。',p('丁寧に引き継ぐ','感謝されながら役割を終えた。',{social:4,work:2}),p('資料をまとめる','知識を残せた。',{study:3,work:1}),p('次の目標を考える','新しい希望が見えてきた。',{mental:4})],
 ['mid-read','人生の本棚','以前は理解できなかった本を読み返した。',p('ゆっくり読み解く','新しい意味が見つかった。',{skill:'読書',skillValue:4}),p('感想を共有する','会話が深まった。',{social:3,mental:2}),p('仕事に応用する','思いがけない発想が生まれた。',{work:3})],
 ['mid-weather','大雨への備え','強い雨が続き、地域で注意が呼びかけられた。',p('避難情報を確認する','落ち着いて備えられた。',{study:3,mental:1}),p('家族へ連絡する','状況を共有できた。',{social:4}),p('必要なものを整理する','生活の備えを見直した。',{study:3})],
 ['mid-festival','地域の催し','久しぶりの地域イベントが開かれる。',p('手伝いに参加する','地域とつながれた。',{social:5,energy:-2}),p('友だちを誘って楽しむ','良い時間を過ごせた。',{social:3,mental:3}),p('記録係を務める','イベントを形に残した。',{skill:'パソコン',skillValue:3})],
]);
S('第二の人生',65,120,[
 ['senior-walk','朝の散歩','季節の変化を感じる時間ができた。',p('安全な道を歩く','無理なく体を動かせた。',{physical:3,energy:-1}),p('写真を撮る','小さな楽しみが増えた。',{mental:4}),p('知人に声をかける','穏やかな会話ができた。',{social:4})],
 ['senior-history','昔のアルバム','引き出しから昔の写真が出てきた。',p('思い出を整理する','これまでの歩みを実感した。',{mental:4}),p('家族に話をする','昔の話を伝えられた。',{social:5}),p('写真を保存する','大切な記録を残せた。',{skill:'パソコン',skillValue:3})],
 ['senior-learning','学び直し講座','地域の学習講座に参加できる。',p('興味のある授業に出る','新しいことを知れた。',{study:4}),p('参加者と交流する','仲間が増えた。',{social:5}),p('家で予習する','自分のペースで学べた。',{skill:'読書',skillValue:3})],
 ['senior-garden','小さな庭の手入れ','花が咲く季節が来た。',p('土を整える','軽い運動になった。',{physical:3,energy:-2}),p('花を眺める','心が落ち着いた。',{mental:5}),p('苗を分ける','喜んでもらえた。',{social:4})],
 ['senior-library','図書館の集まり','地域の読書会が始まる。',p('気になる本を読む','物語を楽しめた。',{skill:'読書',skillValue:4}),p('感想を話す','新しい考えを知った。',{social:4,mental:1}),p('運営を手伝う','居場所が増えた。',{social:3,energy:-1})],
 ['senior-grand','次世代との交流','若い人から昔の生活について質問された。',p('当時の工夫を教える','経験が役に立った。',{social:5}),p('一緒に調べる','互いに新しいことを学んだ。',{study:3,social:2}),p('話を記録する','大切な記憶を残した。',{skill:'読書',skillValue:3})],
 ['senior-health','体調とのつきあい','以前と同じペースでは疲れる日がある。',p('無理せず休む','体を休められた。',{energy:7}),p('軽く体を動かす','心地よく運動できた。',{physical:3,energy:-1}),p('生活を整理する','疲れにくい日課を考えた。',{study:2,mental:2})],
 ['senior-reunion','旧友からのお便り','久しぶりに懐かしい名前を見た。',p('手紙を返す','再びつながれた。',{social:5}),p('電話をかける','懐かしい声が聞けた。',{social:4,mental:2}),p('写真を見返す','良い時間になった。',{mental:5})],
 ['senior-music','懐かしい音楽','昔よく聴いた曲が流れた。',p('ゆっくり聴く','心がほぐれた。',{mental:5}),p('一緒に口ずさむ','楽しさを分かち合った。',{social:3,mental:2}),p('思い出を書き残す','記録が一つ増えた。',{skill:'読書',skillValue:3})],
 ['senior-tech','便利な新しい道具','暮らしを助ける機器に興味を持った。',p('使い方を習う','便利に使えるようになった。',{skill:'パソコン',skillValue:4}),p('家族に教わる','楽しく交流できた。',{social:4}),p('必要性を考える','自分に合う方法を選べた。',{study:3})],
 ['senior-community','地域の見守り','近所で助け合いの活動が始まった。',p('できる範囲で参加','役割を持てた。',{social:5,energy:-2}),p('情報をまとめる','地域への貢献になった。',{study:3,social:1}),p('自分の体調を優先','長く続けられるようにした。',{energy:5,mental:2})],
 ['senior-travel','日帰りの小旅行','無理のない距離で出かける機会が来た。',p('ゆっくり名所を巡る','気分が明るくなった。',{mental:5,energy:-2}),p('景色を写真に残す','思い出が増えた。',{skill:'パソコン',skillValue:2,mental:2}),p('近場で過ごす','疲れを残さず楽しめた。',{energy:4,social:2})],
]);

// Contextual encounters become eligible only when the actual saved state satisfies the precondition.
// 'thread:' keys connect ordinary encounters to STEP 45 choices.
S('状況に応じた出来事',0,120,[
 ['ctx-lowenergy','疲れが抜けない','ここ数日は元気が出ず、予定の見直しが必要だ。',p('休息を優先','疲れを和らげられた。',{energy:9,mental:2}),p('予定を減らす','心に余裕を持てた。',{energy:5,mental:3}),p('周囲に助けを求める','負担を分け合えた。',{social:3,energy:4}),'lowEnergy'],
 ['ctx-illness','体調不良が続く','体調が回復せず、日常に支障を感じている。',p('受診を検討する','治療の必要性を確認した。',{study:2,energy:3}),p('無理なく休む','回復に向けて休養を取った。',{energy:6,mental:2}),p('家族に相談する','一人で抱えずに済んだ。',{social:4,mental:2}),'illness'],
 ['ctx-lowfunds','財布が心細い','今月は思った以上に支出が多くなった。',p('固定費を調べる','家計を見直すきっかけになった。',{study:3}),p('買い物を控える','支出を抑える計画が立った。',{mental:2,study:2}),p('家族に相談する','必要な助言を得られた。',{social:3}),'lowFunds'],
 ['ctx-savings','貯蓄の使い道','少しずつ蓄えた資金をどう扱うか。',p('緊急時の予備として保持','安心につながった。',{mental:4}),p('長期計画を立てる','目標が整理できた。',{study:4}),p('専門家の情報を調べる','選択のための知識が増えた。',{study:3}),'savings'],
 ['ctx-hasjob','職場からの相談','職場で新しい役割を打診された。',p('条件を確認して受ける','責任ある仕事を経験した。',{work:4,energy:-4}),p('同僚と分担する','無理なく進められた。',{work:2,social:3}),p('現状の仕事を優先する','品質を守れた。',{mental:3,work:1}),'hasJob'],
 ['ctx-unemployed','仕事探しが長引く','応募先を探しているが決め手が見つからない。',p('求人条件を広げる','応募の選択肢が増えた。',{study:3}),p('技能を磨く','次の応募に備えた。',{skill:'パソコン',skillValue:4,energy:-2}),p('公的支援を調べる','利用できる制度を知った。',{study:3,mental:1}),'jobless'],
 ['ctx-partner','二人の予定','大切な相手と休日の過ごし方が合わない。',p('ゆっくり話し合う','お互いの希望が分かった。',{social:5,socialTarget:'partner'}),p('交代で予定を決める','納得できる方法を見つけた。',{social:4,socialTarget:'partner',mental:1}),p('一人の時間も大切にする','無理のない距離を保てた。',{mental:4,social:1,socialTarget:'partner'}),'partner'],
 ['ctx-children','子どもの悩み','子どもが学校や友人のことで悩んでいるようだ。',p('時間をかけて話を聞く','安心して話してくれた。',{social:5,socialTarget:'child',energy:-2}),p('一緒に解決策を考える','前向きな計画を作れた。',{social:4,socialTarget:'child',study:2}),p('無理に聞き出さず見守る','自分のペースを尊重できた。',{social:3,socialTarget:'child',mental:2}),'children'],
 ['ctx-family','家族の集まり','家族が集まる機会ができた。',p('みんなの話を聞く','家族の近況を知れた。',{social:4,socialTarget:'family'}),p('準備を手伝う','楽しい時間を作れた。',{social:4,socialTarget:'family',energy:-2}),p('感謝を伝える','大切な気持ちが伝わった。',{social:5,socialTarget:'family'}),'family'],
 ['ctx-high-study','学習の成果','積み重ねてきた学びが周囲の目に留まった。',p('学習法を紹介する','人に教えることで理解が深まった。',{study:2,social:3}),p('より難しい分野へ進む','新しい課題を見つけた。',{study:4,energy:-3}),p('仲間の勉強を支援','一緒に成長できた。',{social:4,study:1}),'highStudy'],
 ['ctx-sport-skill','運動の積み重ね','続けてきた運動の効果を感じる。',p('無理なく継続する','良い習慣が身についた。',{physical:4}),p('新しい競技を試す','体を動かす幅が広がった。',{skill:'運動',skillValue:4,energy:-3}),p('友人と楽しむ','運動を通じて交流できた。',{social:4}),'sportSkill'],
 ['ctx-tech-skill','パソコンを頼られる','詳しいと聞いた知人から相談された。',p('一緒に問題を解く','人の役に立てた。',{skill:'パソコン',skillValue:3,social:3}),p('手順書を作る','知識を形に残した。',{study:3}),p('自分で学び直す','知らない機能を理解できた。',{skill:'パソコン',skillValue:4}),'techSkill'],
 ['ctx-research','昔の研究ノート','子どもの頃に夢中だった疑問を思い出した。',p('再び調べ始める','探究の楽しさを思い出した。',{study:4}),p('成果を人に伝える','関心を分かち合えた。',{social:3,skill:'パソコン',skillValue:2}),p('今の仕事に結びつける','新しい発想が生まれた。',{work:2,study:2}),'thread:spark:research'],
 ['ctx-sports-path','昔の練習仲間','以前のスポーツ仲間から連絡があった。',p('久しぶりに一緒に動く','絆が深まった。',{physical:3,social:3}),p('練習方法を教える','経験を活かせた。',{social:4,skill:'運動',skillValue:2}),p('試合を観戦する','楽しみを共有できた。',{mental:4,social:1}),'thread:spark:sport'],
 ['ctx-creative-path','作品への感想','昔作った作品を見た人から感想が届いた。',p('新作を作る','創作の意欲が戻った。',{skill:'読書',skillValue:3,mental:2}),p('交流する','新しいつながりができた。',{social:4}),p('作品を整理する','これまでの歩みを振り返った。',{mental:4}),'thread:spark:creative'],
 ['ctx-friends-path','友情が助けになる','昔の友人が困っていることを知った。',p('話を聞く','信頼を深めた。',{social:5}),p('できる範囲で協力','互いの力になれた。',{social:3,mental:2}),p('専門家を紹介する','解決につながる情報を伝えた。',{study:2,social:3}),'thread:bonds:friend'],
 ['ctx-family-path','大切な家族の節目','家族にとって大切な日が近づいている。',p('一緒に準備をする','思い出に残る日になった。',{social:5,socialTarget:'family'}),p('話を聞く','相手の願いを知れた。',{social:4,socialTarget:'family'}),p('手紙を書く','感謝を伝えられた。',{mental:3,social:2,socialTarget:'family'}),'thread:bonds:family'],
 ['ctx-independent-path','自分で決める場面','長く大事にしてきた自立心が試される。',p('一人で整理する','決断に自信がついた。',{study:3,mental:2}),p('助言だけ受ける','視点を広げられた。',{social:2,study:2}),p('協力を選ぶ','人に頼る強さを知った。',{social:4}),'thread:bonds:independent'],
 ['ctx-specialist','専門性への相談','これまでに培った専門知識を必要とする人がいる。',p('知識を伝える','誰かの役に立てた。',{work:3,social:2}),p('課題を詳しく調査','理解がさらに深まった。',{study:4,energy:-3}),p('後輩に任せる','後継者を育てるきっかけになった。',{social:4}),'thread:career:specialist'],
 ['ctx-stability','安定と余白','安定した生活の中に少しだけ余裕がある。',p('家族や友人との時間に','関係を深められた。',{social:4}),p('新しい技能に挑む','無理なく学べた。',{skill:'パソコン',skillValue:3}),p('休養に充てる','心身が回復した。',{energy:5,mental:2}),'thread:career:stability'],
 ['ctx-venture','企画へのお誘い','以前の挑戦を知る人から新しい提案を受けた。',p('条件を確認して参加','経験が増えた。',{work:4,energy:-4}),p('小さく試す','安全に試行錯誤できた。',{study:3,work:2}),p('今は準備に集中','次に備えることにした。',{mental:2,study:2}),'thread:career:venture'],
 ['ctx-community','地域での頼まれごと','周囲への貢献が認められ、相談が集まった。',p('できる範囲で受ける','信頼が深まった。',{social:4,energy:-2}),p('協力者を募る','活動を継続しやすくした。',{social:5}),p('自分の健康も優先','無理のない役割を選んだ。',{physical:3,mental:2}),'thread:values:community'],
 ['ctx-growth','学び直しの発表','続けてきた学びを発表できる機会が来た。',p('思い切って発表','努力が形になった。',{study:4,social:2}),p('勉強仲間と共同で','協力して伝えられた。',{social:4}),p('もう少し準備する','完成度を高めた。',{skill:'読書',skillValue:3}),'thread:values:growth'],
 ['ctx-wellbeing','暮らしのリズム','生活のペースを大切にする日々が続く。',p('散歩を楽しむ','日々の調子を保てた。',{physical:4}),p('休息を優先する','疲れを減らせた。',{energy:6}),p('近所の人と話す','穏やかな交流になった。',{social:3,mental:2}),'thread:values:wellbeing'],
]);

// Unexpected opportunities and setbacks are rarer than daily routines but have real trade-offs.
S('思いがけない出来事',18,64,[
 ['chance-commission','臨時の仕事を頼まれた','職場で短期の応援業務を募集している。',p('追加の仕事を引き受ける','業務手当を得たが疲れも残った。',{cash:8000,energy:-6,work:2}),p('仲間と分担する','負担を抑えて手当を得た。',{cash:4000,social:3,energy:-3}),p('無理をせず断る','生活のペースを守れた。',{mental:4,energy:3}),'hasJob'],
 ['chance-repairs','生活用品の故障','長く使っていた生活用品が壊れてしまった。',p('修理して使い続ける','修理費がかかったが使えるようになった。',{cash:-4000,study:2}),p('応急対応を調べる','出費を抑えて対処した。',{study:4,energy:-3}),p('しばらく代用品を使う','不便はあるが様子を見ることにした。',{mental:-1,study:2})],
 ['chance-neighbor','思わぬ助け','重い荷物を抱えている人を見かけた。',p('荷物運びを手伝う','ありがとうと声をかけられた。',{social:4,energy:-3}),p('別の人にも声をかける','協力して運ぶことができた。',{social:5}),p('安全な運び方を調べる','負担の少ない方法が見つかった。',{study:3})],
 ['chance-brokenphone','連絡手段の故障','大事な用事の前にスマートフォンが動かなくなった。',p('修理を依頼する','費用はかかったが使用できるようになった。',{cash:-5000,mental:1}),p('別の連絡手段を探す','予定に間に合う方法が見つかった。',{study:3,energy:-2}),p('関係者に事情を説明する','理解してもらえた。',{social:3,mental:1})],
 ['chance-lostwallet','落とし物','財布が見つからず、心配になってきた。',p('歩いた道を確認する','無事に見つけられた。',{study:2,energy:-3}),p('必要な窓口へ相談','落ち着いて対処できた。',{study:3,mental:2}),p('カード類の管理を見直す','安全な備えが進んだ。',{study:4})],
 ['chance-storm','急な天候の悪化','外出先で急に強い雨が降り始めた。',p('安全な場所で待つ','無理せずやり過ごせた。',{energy:2,mental:3}),p('交通情報を確認する','安全な帰路が分かった。',{study:3}),p('周囲と助け合う','安心して行動できた。',{social:4,energy:-1})],
 ['chance-injury','軽いけが','家事の途中で手を痛めてしまった。',p('すぐに休んで手当て','悪化を防げたが少し休養が必要だ。',{physical:-3,energy:3}),p('無理をせず助けを頼む','負担を減らせた。',{social:3,physical:-2}),p('予定を変更して休む','回復を優先できた。',{physical:-2,mental:2})],
 ['chance-accident','交通の危険','移動中に危ない場面に遭遇した。',p('安全な場所へ移動','危険を避けられたが疲れた。',{energy:-4,mental:-2}),p('周囲に注意を伝える','ほかの人の事故も防げた。',{social:3,energy:-3}),p('行動を見直す','安全な方法を考え直した。',{study:3,mental:1})],
 ['chance-helpful','思いがけない親切','困っていると見知らぬ人が手助けしてくれた。',p('丁寧にお礼を伝える','互いに笑顔になった。',{social:4,mental:2}),p('自分も誰かを助ける','親切の輪を広げられた。',{social:5,energy:-2}),p('気持ちを記録する','うれしい出来事を覚えておけた。',{mental:4})],
 ['chance-offer','新しい学びへの招待','興味のある分野の体験会に誘われた。',p('参加してみる','知識が広がった。',{study:4,energy:-2}),p('友人も誘う','一緒に楽しめた。',{social:4,study:1}),p('内容を調べてから判断','必要な情報が得られた。',{study:3,mental:1})],
 ['chance-reward','仕事での評価','地道に続けた仕事が社内で評価された。',p('成果をチームと分かち合う','職場の信頼が高まった。',{work:3,social:3}),p('次の目標を立てる','専門性がさらに深まった。',{work:4,energy:-3}),p('休暇を大切にする','燃え尽きを防げた。',{energy:5,mental:2}),'hasJob'],
 ['chance-smallprize','作品が評価された','応募した作品に温かい感想が届いた。',p('次の作品を作る','創作の意欲が高まった。',{skill:'読書',skillValue:4,energy:-2}),p('感想に返事をする','交流の輪が広がった。',{social:4,mental:2}),p('これまでの作品を振り返る','成長を実感した。',{mental:5}),'thread:spark:creative'],
]);
S('学校での思いがけない出来事',6,17,[
 ['school-surprise-award','意外な表彰','いつもの活動が先生の目に留まった。',p('感謝を伝える','自信につながった。',{mental:4,social:2}),p('仲間と喜ぶ','頑張りを分かち合えた。',{social:4}),p('次の目標を決める','意欲が高まった。',{study:4})],
 ['school-surprise-sickness','体調を崩した朝','学校へ行く準備中に少し熱っぽくなった。',p('家族へ知らせて休む','体調を優先できた。',{energy:5,physical:-2}),p('予定を整理して休む','無理を避けられた。',{study:2,energy:3}),p('家族と相談する','安心して判断できた。',{social:3,mental:1})],
 ['school-surprise-lost','忘れ物に気づいた','授業に必要なものを忘れてしまった。',p('先生に正直に話す','次からの準備を考えた。',{mental:2,study:2}),p('友だちに相談する','助けてもらえた。',{social:3}),p('代わりの方法を工夫する','対応力がついた。',{study:4})],
 ['school-surprise-guest','特別授業','地域で働く人が学校に話をしに来た。',p('仕事のことを質問する','将来を考えるヒントになった。',{study:4}),p('体験を手伝う','新しい経験ができた。',{social:3,study:2}),p('話を記録する','大切な言葉を覚えておけた。',{skill:'読書',skillValue:3})],
 ['school-surprise-newfriend','偶然の共通点','隣の席の人と好きなことが同じだった。',p('話しかける','新しい友情が始まった。',{social:5}),p('一緒に活動する','楽しい時間を過ごせた。',{social:3,energy:-1}),p('おすすめを教える','互いの世界が広がった。',{study:2,social:2})],
 ['school-surprise-tournament','突然の出場依頼','欠員が出て大会への参加を頼まれた。',p('挑戦してみる','緊張したが貴重な経験になった。',{skill:'運動',skillValue:4,energy:-4}),p('サポート役になる','全体を支えられた。',{social:4}),p('練習を優先する','今できる準備を続けた。',{physical:3,mental:1})],
]);
S('老後の思いがけない出来事',65,110,[
 ['senior-surprise-friend','偶然の再会','散歩先で懐かしい知人と再会した。',p('近況を話す','思い出話に花が咲いた。',{social:5,mental:2}),p('また会う約束をする','新しい楽しみが増えた。',{social:4}),p('写真を見せ合う','昔を振り返れた。',{mental:4})],
 ['senior-surprise-help','近所の人の助け','少し重い荷物で困っていると声をかけられた。',p('感謝して助けてもらう','負担を減らせた。',{social:3,energy:3}),p('一緒に運ぶ','無理なく協力できた。',{social:4,physical:1}),p('配送方法を調べる','今後の備えを考えた。',{study:3})],
 ['senior-surprise-invite','講演の依頼','長年の経験を話してほしいと頼まれた。',p('経験を語る','誰かの参考になった。',{social:5,mental:2}),p('資料を作る','記録を残せた。',{study:3,energy:-2}),p('小さな集まりを提案','無理なく交流できた。',{social:4})],
 ['senior-surprise-season','季節の変わり目','気温差が大きく、体調管理が気になった。',p('無理なく休む','疲れをためずに済んだ。',{energy:6}),p('軽い体操をする','体を動かす習慣を保てた。',{physical:3,energy:-1}),p('家族と過ごす','穏やかな時間になった。',{social:4,mental:2})],
 ['senior-surprise-learning','新しい発見','テレビで聞いた話に興味を持った。',p('図書館で調べる','知らなかったことを学んだ。',{study:4}),p('知人と語り合う','新しい見方に出会った。',{social:4}),p('日記に書く','好奇心を保てた。',{skill:'読書',skillValue:3})],
 ['senior-surprise-volunteer','感謝の手紙','以前手伝った活動からお礼の手紙が届いた。',p('返事を書く','つながりが続いた。',{social:5}),p('また参加を考える','楽しみが増えた。',{mental:3,social:2}),p('家族に見せる','喜びを共有できた。',{social:3,mental:3})],
]);

export const LIFE_EVENT_CATALOG=Object.freeze(C.map(e=>Object.freeze({...e,options:Object.freeze(e.options.map(o=>Object.freeze({...o,impact:Object.freeze({...o.impact})})))})));
export function catalogStatistics(){
 const byStage={};const conditional={};for(const e of C){byStage[e.tag]=(byStage[e.tag]??0)+1;if(e.when)conditional[e.when]=(conditional[e.when]??0)+1;}
 return {total:C.length,byStage,conditional,totalChoices:C.length*3};
}
export function isEventEligible(e,state,age){
 if(age<e.min||age>e.max)return false;
 const when=e.when;
 if(when&&!state)return false;
 const f=state?.finances, people=state?.people??[], h=state?.health, edu=state?.education;
 if(state){
   const mostExpensive=Math.max(0,...e.options.map(o=>Math.max(0,-(o.impact?.cash??0))));
   if((f?.cash??0)<mostExpensive)return false;
 }
 if(!when)return true;
 const partner=people.some(x=>['配偶者','交際相手'].includes(x.role));
 switch(when){
 case 'lowEnergy':return (h?.energy??100)<=40;
 case 'illness':return Boolean(h?.illness);
 case 'lowFunds':return (f?.cash??0)<30000&&age>=18;
 case 'savings':return (f?.cash??0)>=300000&&age>=18;
 case 'hasJob':return age>=18&&Boolean(f?.career?.job);
 case 'jobless':return age>=18&&!f?.career?.job;
 case 'partner':return age>=18&&partner;
 case 'children':return people.some(x=>x.role==='子');
 case 'family':return age>=6&&people.some(x=>['父','母','配偶者','子'].includes(x.role));
 case 'highStudy':return age>=6&&Object.values(edu?.scores??{}).reduce((s,v)=>s+v,0)/Math.max(1,Object.keys(edu?.scores??{}).length)>=72;
 case 'sportSkill':return age>=8&&(edu?.skills?.運動??0)>=25;
 case 'techSkill':return age>=12&&(edu?.skills?.パソコン??0)>=25;
 default:
   if(when.startsWith('thread:')){const [,thread,path]=when.split(':');return age>=10&&state?.storyProgress?.threads?.[thread]?.path===path;}
   return false;
 }
}
/** Weighted selection: avoid the 20 most recent catalog events when alternatives exist.
 * Less-used events receive greater weight. All randomness comes from the supplied PRNG draw.
 */
export function selectCatalogEvent(state,age,randomValue){
 const eligible=LIFE_EVENT_CATALOG.filter(e=>isEventEligible(e,state,age));
 if(!eligible.length)return null;
 const recent=(state?.eventHistory??[]).filter(x=>x.story===true&&typeof x.catalogKey==='string');
 const used=recent.slice(-20).map(x=>x.catalogKey);
 let candidates=eligible.filter(e=>!used.includes(e.id));
 if(!candidates.length)candidates=eligible.filter(e=>e.id!==used.at(-1));
 if(!candidates.length)candidates=eligible;
 const counts=new Map();for(const item of recent){counts.set(item.catalogKey,(counts.get(item.catalogKey)??0)+1);}
 const weighted=candidates.map(e=>({event:e,w:(e.when?2:1)/(1+(counts.get(e.id)??0)*2)}));
 const total=weighted.reduce((s,x)=>s+x.w,0);
 let pick=Math.max(0,Math.min(.999999999,Number.isFinite(randomValue)?randomValue:0))*total;
 for(const row of weighted){pick-=row.w;if(pick<0)return row.event;}
 return weighted.at(-1).event;
}
