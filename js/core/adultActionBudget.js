/** One optional action in each different category, at most three after age 18. */
export const ACTION_CATEGORIES=Object.freeze(['人生','生活・資産','人物・家族','学業','仕事・経営','健康','社会']);
const ROUTINE_CATEGORY=Object.freeze({health:'健康',relationships:'人物・家族',learning:'学業'});
const BY_CATEGORY={
 '人生':['setTimePlan','configureLifePreset'],
 '生活・資産':['requestHouseholdRelief','setSpendingStyle','setBudget','reviewBudget','repayDebt','buyVehicle','sellVehicle','moveHome','registerHome','buyProperty','sellProperty','setPropertyUse','repayPropertyLoan','setPropertyPayment','clearPropertyArrears','setMortgagePayment','enableAccurateMortgage','requestPensionExemption','setInsuranceClaimCap','setPensionMode','backPayPension','clearMortgageArrears','repayMortgage','setInsurance','setPropertyCoverage','claimInsurance','repairHome','buyInvestment','sellInvestment'],
 '人物・家族':['changeHouseholdRole','startSpouseLeave','socialize','familyBond','courtship','meetFriend','date','discussFuture','cohabit','engage','holdWedding','marry','setChildEducation','haveChild','familyCare','familyActivity'],
 '学業':['retryUniversityEntrance','takeQualificationExam','prepareQualification','chooseFurtherEducation','studentDay','study','skill','prepareExam','chooseSchool','chooseMajor','university','applyScholarship','setEducationFunding','repayEducation'],
 '仕事・経営':['setCareerTarget','internship','professionalExam','careerProject','employmentSupport','supportRebuilding','careerTraining','setCareerPlan','applyJob','promotionExam','prepareInterview','careerCertification','salaryNegotiation','interactCoworker','resolveWorkIncident','workHard','helpColleague','talkSupervisor','reviewPerformance','findJob','resign','sideJob','startBusiness','closeBusiness','jobSearch'],
 '健康':['habit','treatment','checkup'],
 '社会':['civicActivity'],
};
const ACTION_MAP=new Map(Object.entries(BY_CATEGORY).flatMap(([cat,names])=>names.map(n=>[n,cat])));
export const turnActionCategory=(action,payload={})=>{
 if(action==='setMonthlyRoutine')return ROUTINE_CATEGORY[payload.domain]??null;
 if(action==='adultActivity')return ACTIVITY_CATEGORIES[payload.id]??null;
 if(action==='safetyPrep')return payload.area==='health'?'健康':'生活・資産';
 if(action==='skill')return payload.skill==='運動'?'健康':'学業';
 return ACTION_MAP.get(action)??null;
};
const ACTIVITY_CATEGORIES=Object.freeze({
 'gym-class':'健康','mindfulness':'健康','medical-screening':'健康',
 'family-dinner':'人物・家族','friends-outing':'人物・家族',
 'online-course':'学業','reading-workshop':'学業',
 'job-networking':'仕事・経営','community-volunteer':'社会',
});
export const adultActionLimit=age=>age>=18?3:1;
export function actionBudget(state){
 const turn=state?.timeline?.turnsElapsed??0,age=state?.timeline?.ageYears??0;
 const saved=state?.turnActions?.turn===turn?state.turnActions:null;
 const used=saved?.used??0;
 const categories=saved?.categories??(used?['以前の行動']:[]);
 const limit=adultActionLimit(age);
 const pending=Boolean(state?.pendingEvents?.some(e=>e.type==='choice'));
 return {turn,used,limit,remaining:Math.max(0,limit-used),categories,pending,
   blocked:!state?.initialized||Boolean(state?.ending?.dead)||pending};
}
export function categoryActionAvailable(state,category){
 const a=actionBudget(state);
 return Boolean(!a.blocked&&a.remaining>0&&ACTION_CATEGORIES.includes(category)&&!a.categories.includes(category));
}
export function actionAvailable(state,action,payload={}){
 if(action==='resolveChoice'||action==='setLifeDream')return true;
 const category=turnActionCategory(action,payload);
 return Boolean(category&&categoryActionAvailable(state,category));
}
export function validateTurnActionBudget(a,t){
 if(!a||!Number.isInteger(a.turn)||a.turn<0||a.turn>t.turnsElapsed||!Number.isInteger(a.used)||a.used<0||
    a.used>adultActionLimit(t.ageYears)||!(a.lastAction===null||typeof a.lastAction==='string'&&a.lastAction.length<=40))return false;
 if(a.categories===undefined)return true; // legacy single-action saves
 if(!Array.isArray(a.categories)||a.categories.length!==a.used||new Set(a.categories).size!==a.categories.length)return false;
 return a.categories.every(c=>ACTION_CATEGORIES.includes(c)||c==='以前の行動');
}
