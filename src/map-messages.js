export function messageSeverity(text){
 if(/zwarci|zatop|zaton|woda w zęzie|overheat|alarm temperatury|silna kolizja|zerwan/i.test(text))return'critical';
 if(/uszkodz|uderzeni|kolizj|brak (chłodzenia|paliwa|prądu)|nieudan|naprawa przerwana|tankowanie przerwane|niskie napięcie|śruba.*(dno|dna|piask|kamie)|mielizn|mieliźn|rozładowan|słaby akumulator|akumulator nie pozwala|silnik zgasł|silnik zalany|awaria napędu|przegrzan/i.test(text))return'warning';
 return'info';
}
export function placeMapMessage(el,text){
 const severity=messageSeverity(text),host=document.querySelector(severity==='info'?'.map-notice-stack':'.map-alert-stack');
 if(host&&el.parentElement!==host)host.append(el);el.dataset.severity=severity;
}
