import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 管理者アカウント
  const adminPassword = await bcrypt.hash('admin', 10)
  await prisma.member.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: '管理者',
      team: null,
      role: 'admin',
      password: adminPassword,
    },
  })

  // 評価項目（26項目）
  const items = [
    // 一生懸命（4項目）
    {
      majorCategory: '一生懸命',
      minorCategory: '土俵の真ん中で相撲を取る人(ギリギリじゃない)',
      displayOrder: 1,
    },
    {
      majorCategory: '一生懸命',
      minorCategory: '手抜きやサボりとは無縁な人',
      displayOrder: 2,
    },
    {
      majorCategory: '一生懸命',
      minorCategory: '「できるだけ頑張ったから大丈夫」と満足せず、その結果から改善し行動できる人',
      displayOrder: 3,
    },
    {
      majorCategory: '一生懸命',
      minorCategory: '読書、資格取得、経営計画書の内容を理解して行動している人',
      displayOrder: 4,
    },
    // 素直（2項目）
    {
      majorCategory: '素直',
      minorCategory: 'お互いの信頼関係を築くために、嘘や言い訳、人のせいにしない人',
      displayOrder: 5,
    },
    {
      majorCategory: '素直',
      minorCategory: '分からないことをあやふやにしない人',
      displayOrder: 6,
    },
    // チームワーク（6項目）
    {
      majorCategory: 'チームワーク',
      minorCategory: '自分の仕事だけでなく、人に頼んだ仕事にも最後まで自分事として関われる人',
      displayOrder: 7,
    },
    {
      majorCategory: 'チームワーク',
      minorCategory: 'うわさ話や悪口を言っている人がいる場で、雰囲気をポジティブに変えられる人',
      displayOrder: 8,
    },
    {
      majorCategory: 'チームワーク',
      minorCategory: '成功したこと、良かったことに対して一緒になって喜ぶことができる人',
      displayOrder: 9,
    },
    {
      majorCategory: 'チームワーク',
      minorCategory: '話す内容を分かりやすく、伝わる工夫ができる人',
      displayOrder: 10,
    },
    {
      majorCategory: 'チームワーク',
      minorCategory: '話を聞くとき、相手が話しやすい場を整えることができる人',
      displayOrder: 11,
    },
    {
      majorCategory: 'チームワーク',
      minorCategory: 'お互いの為にスピードで報連相ができる人',
      displayOrder: 12,
    },
    // 前向き（4項目）
    {
      majorCategory: '前向き',
      minorCategory: '自分の意見、意思をしっかり発信できる人',
      displayOrder: 13,
    },
    {
      majorCategory: '前向き',
      minorCategory: '自己の成長のため、気持ちを込めて物事に取り組める人',
      displayOrder: 14,
    },
    {
      majorCategory: '前向き',
      minorCategory: '何事にも「できる」「できない」と決めつけず、できるためにはどうすればいいか考え行動できる人',
      displayOrder: 15,
    },
    {
      majorCategory: '前向き',
      minorCategory: 'いつも元気に笑顔で働く人',
      displayOrder: 16,
    },
    // 利他（3項目）
    {
      majorCategory: '利他',
      minorCategory: '誰かに言われて行動するよりも、自分で考え気配りしてスピードで行動できる人',
      displayOrder: 17,
    },
    {
      majorCategory: '利他',
      minorCategory: '全メンバーの一体感を大切にし、利他の心をもって認め合い、助け合いできる人',
      displayOrder: 18,
    },
    {
      majorCategory: '利他',
      minorCategory: 'その人の為になるならば、言いづらい事でも相手の為に言える人',
      displayOrder: 19,
    },
    {
      majorCategory: '礼儀',
      minorCategory: '備品や経費を自分事として考え、大切にできる人',
      displayOrder: 20,
    },
    // 礼儀（4項目）
    {
      majorCategory: '礼儀',
      minorCategory: '誰に対しても自分が置かれた状況やその日の気分によって言葉や態度を変えない人',
      displayOrder: 21,
    },
    {
      majorCategory: '礼儀',
      minorCategory: '「机をそろえる」「ゴミを拾う」等の行動を実行できる人（行動の気づかいができる）',
      displayOrder: 22,
    },
    {
      majorCategory: '礼儀',
      minorCategory: '相手の時間を大切にするために、決められた時間・期限をしっかり守る人',
      displayOrder: 23,
    },
    {
      majorCategory: '率先垂範',
      minorCategory: '決められたことは毎回やる。（丁寧な掃除や元気な挨拶、きびきびとしたラジオ体操をする）',
      displayOrder: 24,
    },
    // 率先垂範（3項目）
    {
      majorCategory: '率先垂範',
      minorCategory: 'MPS活動やプロジェクト活動などの会社の取り組みに主体的に参加している人',
      displayOrder: 25,
    },
    {
      majorCategory: '率先垂範',
      minorCategory: '人の嫌がることこそ進んで行動できる人',
      displayOrder: 26,
    },
  ]

  // 既存の評価項目を削除してから新しい項目を追加
  await prisma.evaluationItem.deleteMany({})

  for (const item of items) {
    await prisma.evaluationItem.create({
      data: {
        majorCategory: item.majorCategory,
        minorCategory: item.minorCategory,
        displayOrder: item.displayOrder,
      },
    })
  }

  // メンバー追加（username=数値ID、パスワード=同じ数値、チームはA〜Jに均等割り振り）
  const membersData = [
    { username: '631', name: '平山貴規' },
    { username: '725', name: '嶋井敦' },
    { username: '512', name: '小野元義' },
    { username: '574', name: '森嶋幹雄' },
    { username: '611', name: '西垣栄明' },
    { username: '683', name: '井藤友良' },
    { username: '612', name: '橋詰淳' },
    { username: '613', name: '横井俊彦' },
    { username: '724', name: '村中佑次' },
    { username: '729', name: '村瀬功治' },
    { username: '752', name: '安田陽司' },
    { username: '708', name: '片野正暁' },
    { username: '750', name: '水野広司' },
    { username: '650', name: '崎田美成' },
    { username: '604', name: '西垣英和' },
    { username: '656', name: '日比野保志' },
    { username: '692', name: '田中文保' },
    { username: '712', name: '土田はるみ' },
    { username: '715', name: '大野千華' },
    { username: '727', name: '萩永晃大' },
    { username: '738', name: '桑原七美' },
    { username: '737', name: '日置文也' },
    { username: '739', name: '佐村瞳' },
    { username: '743', name: '山中嘉太朗' },
    { username: '742', name: '加藤光太朗' },
    { username: '747', name: '森本杏樹' },
    { username: '751', name: '髙井俊輔' },
    { username: '755', name: '北村知也' },
    { username: '756', name: '久木野純矢' },
    { username: '757', name: '洞田尚弥' },
    { username: '760', name: '藤橋健一' },
    { username: '761', name: '浅野隆浩' },
    { username: '765', name: '小澤栞' },
    { username: '767', name: '古澤花菜' },
    { username: '771', name: '田中亜美' },
    { username: '773', name: '松嵜奈央' },
    { username: '774', name: '坂本祥輝' },
    { username: '777', name: '早川智貴' },
    { username: '778', name: '栁澤大河' },
    { username: '779', name: '古川晃平' },
    { username: '615', name: '水谷真也' },
    { username: '780', name: '鬼頭 昇平' },
    { username: '781', name: '日置江早也佳' },
    { username: '782', name: '荻上拓大' },
    { username: '783', name: '武藤朱音' },
    { username: '785', name: '加藤諒也' },
    { username: '786', name: '加野大' },
    { username: '619', name: '水谷浩士' },
    { username: '1000', name: '山田理恵' },
    { username: '633', name: '岩井睦' },
    { username: '787', name: '足立真子' },
    { username: '788', name: '大江勇輔' },
    { username: '789', name: '坂本朱理' },
    { username: '790', name: '山田一登' },
    { username: '791', name: '林美来' },
    { username: '793', name: '村上達哉' },
    { username: '795', name: '川尻晴菜' },
    { username: '794', name: '原田悠平' },
    { username: '796', name: '近藤郁海' },
    { username: '797', name: '河村淳生' },
    { username: '798', name: '赤塚倫太郎' },
    { username: '800', name: '安江浩睦' },
    { username: '799', name: '水谷啓佑' },
    { username: '801', name: '髙橋政輝' },
    { username: '802', name: '原田龍一' },
  ]
  const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const allMembers = membersData.map((m, i) => ({ ...m, team: teams[i % teams.length] }))

  for (const member of allMembers) {
    const password = await bcrypt.hash(member.username, 10)
    await prisma.member.upsert({
      where: { username: member.username },
      update: {
        name: member.name,
        team: member.team,
      },
      create: {
        ...member,
        role: 'user',
        password,
      },
    })
  }

  // 評価期間の作成（前月と今月）
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  
  // 前月を計算
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const previousYearMonth = `${previousYear}-${String(previousMonth).padStart(2, '0')}`
  const currentYearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  
  // 前月の評価期間（非アクティブ）
  const prevStartDate = `${previousYear}-${String(previousMonth).padStart(2, '0')}-01`
  const prevEndDate = `${previousYear}-${String(previousMonth).padStart(2, '0')}-${new Date(previousYear, previousMonth, 0).getDate()}`
  
  await prisma.evaluationPeriod.upsert({
    where: { yearMonth: previousYearMonth },
    update: {},
    create: {
      yearMonth: previousYearMonth,
      startDate: prevStartDate,
      endDate: prevEndDate,
      isActive: false,
    },
  })
  
  // 今月の評価期間（アクティブ）
  const currentStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const currentEndDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`
  
  await prisma.evaluationPeriod.upsert({
    where: { yearMonth: currentYearMonth },
    update: {},
    create: {
      yearMonth: currentYearMonth,
      startDate: currentStartDate,
      endDate: currentEndDate,
      isActive: true,
    },
  })

  // 月次推移用：さらに2ヶ月前の評価期間を追加
  const month2 = currentMonth <= 2 ? currentMonth + 10 : currentMonth - 2
  const year2 = currentMonth <= 2 ? currentYear - 1 : currentYear
  const yearMonth2 = `${year2}-${String(month2).padStart(2, '0')}`
  const month3 = currentMonth <= 3 ? currentMonth + 9 : currentMonth - 3
  const year3 = currentMonth <= 3 ? currentYear - 1 : currentYear
  const yearMonth3 = `${year3}-${String(month3).padStart(2, '0')}`

  for (const { ym, y, m } of [
    { ym: yearMonth2, y: year2, m: month2 },
    { ym: yearMonth3, y: year3, m: month3 },
  ]) {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const end = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`
    await prisma.evaluationPeriod.upsert({
      where: { yearMonth: ym },
      update: {},
      create: {
        yearMonth: ym,
        startDate: start,
        endDate: end,
        isActive: false,
      },
    })
  }
  
  // テスト用の評価データ（前月の評価を追加）
  // すべてのユーザーが、自分のチームの全メンバーを評価したデータを作成
  const evaluationItems = await prisma.evaluationItem.findMany({
    orderBy: { displayOrder: 'asc' },
  })
  
  // チームごとにグループ化
  const membersByTeam = new Map<string, typeof allMembers>()
  for (const member of allMembers) {
    if (!membersByTeam.has(member.team)) {
      membersByTeam.set(member.team, [])
    }
    membersByTeam.get(member.team)!.push(member)
  }
  
  let totalEvaluations = 0
  
  // 各チームの全メンバーが、自分のチームの全メンバー（自分含む）を評価
  for (const [team, teamMembers] of membersByTeam) {
    for (const evaluator of teamMembers) {
      const evaluatorMember = await prisma.member.findUnique({
        where: { username: evaluator.username },
      })
      
      if (!evaluatorMember) continue
      
      for (const evaluated of teamMembers) {
        const evaluatedMember = await prisma.member.findUnique({
          where: { username: evaluated.username },
        })
        
        if (!evaluatedMember) continue
        
        // 各評価項目に対してランダムなスコア（5-10点）を設定
        for (const item of evaluationItems) {
          const score = Math.floor(Math.random() * 6) + 5 // 5-10点
          
          await prisma.evaluation.upsert({
            where: {
              evaluator_evaluated_item_year_month: {
                evaluatorId: evaluatorMember.id,
                evaluatedId: evaluatedMember.id,
                itemId: item.id,
                yearMonth: previousYearMonth,
              },
            },
            update: {
              score,
            },
            create: {
              evaluatorId: evaluatorMember.id,
              evaluatedId: evaluatedMember.id,
              itemId: item.id,
              score,
              yearMonth: previousYearMonth,
            },
          })
          totalEvaluations++
        }
      }
    }
  }
  
  console.log(`前月(${previousYearMonth})の評価データを追加しました`)
  console.log(`- 評価者: 全ユーザー`)
  console.log(`- 評価項目: ${evaluationItems.length}項目`)
  console.log(`- 総評価数: ${totalEvaluations}件`)

  // 月次推移用：2ヶ月前・3ヶ月前の評価データを追加（スコアを段階的に上げて推移が分かるように）
  const monthlySeedMonths: { yearMonth: string; scoreMin: number; scoreMax: number }[] = [
    { yearMonth: yearMonth3, scoreMin: 4, scoreMax: 6 },
    { yearMonth: yearMonth2, scoreMin: 5, scoreMax: 7 },
  ]
  for (const { yearMonth, scoreMin, scoreMax } of monthlySeedMonths) {
    for (const [team, teamMembers] of membersByTeam) {
      for (const evaluator of teamMembers) {
        const evaluatorMember = await prisma.member.findUnique({
          where: { username: evaluator.username },
        })
        if (!evaluatorMember) continue
        for (const evaluated of teamMembers) {
          const evaluatedMember = await prisma.member.findUnique({
            where: { username: evaluated.username },
          })
          if (!evaluatedMember) continue
          for (const item of evaluationItems) {
            const score = Math.floor(Math.random() * (scoreMax - scoreMin + 1)) + scoreMin
            await prisma.evaluation.upsert({
              where: {
                evaluator_evaluated_item_year_month: {
                  evaluatorId: evaluatorMember.id,
                  evaluatedId: evaluatedMember.id,
                  itemId: item.id,
                  yearMonth,
                },
              },
              update: { score },
              create: {
                evaluatorId: evaluatorMember.id,
                evaluatedId: evaluatedMember.id,
                itemId: item.id,
                score,
                yearMonth,
              },
            })
            totalEvaluations++
          }
        }
      }
    }
    console.log(`月次推移用: ${yearMonth} の評価データを追加しました（スコア ${scoreMin}-${scoreMax}点）`)
  }

  console.log('Seed data created successfully!')
  console.log('月次推移タブで複数月のグラフを確認できます。（例: チームAのユーザーでログイン）')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
