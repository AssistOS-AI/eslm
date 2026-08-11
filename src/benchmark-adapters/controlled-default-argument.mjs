import { atom, binary, negate } from '../reasoning/finite-entailment.mjs';
import { decidePreferredEntailment } from '../reasoning/preferred-entailment.mjs';

function identifier(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '');
}

function sentences(text) {
  return text.split(/\.\s*/u).map((item) => item.trim()).filter(Boolean);
}

function splitMembers(surface) {
  return surface.replace(/,\s+and\s+/giu, ', ').split(/\s+and\s+|,\s*/iu).map((item) => item.trim()).filter(Boolean);
}

function polarityOf(surface) {
  return !/\b(?:not|never|no\s+one|isn['’]?t|aren['’]?t|doesn['’]?t|don['’]?t|can['’]?t|won['’]?t)\b/iu.test(surface);
}

function literalFor(formula, positive) {
  return positive ? formula : negate(formula);
}

function conjunction(formulas) {
  return formulas.reduce((left, right) => left ? binary('and', left, right) : right, undefined);
}

function exclusiveOr(left, right) {
  return binary('and', binary('or', left, right), negate(binary('and', left, right)));
}

function parsePriorityArgument(context, question) {
  const claims = [...context.matchAll(/(?:^|\.\s*)([\p{L}][\p{L}\p{N}_-]*)\s+asserts that\s+(.+?)(?=\.|$)/giu)];
  if (claims.length !== 2) return undefined;
  const conditional = /^if\s+([\p{L}][\p{L}\p{N}_-]*)['’]s evidence is\s+(more|less)\s+reliable than\s+([\p{L}][\p{L}\p{N}_-]*)['’]s,\s*(?:does|do)\s+this\s+(?:imply|entail|mean)\s+that\s+(.+?)[?]*$/iu.exec(question.trim());
  if (!conditional) return undefined;
  const propositionId = `claim:${identifier(claims[0][2].replace(/\bnot\b/iu, ''))}`;
  const proposition = atom(propositionId);
  const evidence = claims.map((claim) => atom(`evidence:${identifier(claim[1])}`));
  const named = new Map(claims.map((claim, index) => [claim[1].toLocaleLowerCase('en-US'), index]));
  const comparedIndex = named.get(conditional[1].toLocaleLowerCase('en-US'));
  const otherIndex = named.get(conditional[3].toLocaleLowerCase('en-US'));
  if (comparedIndex === undefined || otherIndex === undefined) return undefined;
  const comparedHigher = conditional[2].toLocaleLowerCase('en-US') === 'more';
  const priorities = comparedHigher ? [2, 1] : [1, 2];
  const orderedPriorities = [];
  orderedPriorities[comparedIndex] = priorities[0];
  orderedPriorities[otherIndex] = priorities[1];
  const defaults = claims.map((claim, index) => ({
    antecedent: evidence[index], consequent: literalFor(proposition, polarityOf(claim[2])),
    priority: orderedPriorities[index],
  }));
  const result = decidePreferredEntailment({
    premises: evidence, defaults, query: literalFor(proposition, polarityOf(conditional[4])),
  });
  return { ...result, method: 'method:core:preferred-entailment', semanticTrace: { defaults, query: conditional[4] } };
}

function membershipTheory(context) {
  const parts = sentences(context);
  const first = /^(.+?)\s+are\s+(.+)$/iu.exec(parts[0] ?? '');
  if (!first || /^all\s+/iu.test(first[1])) return undefined;
  const members = splitMembers(first[1]);
  if (members.length === 0) return undefined;
  const className = first[2].trim();
  const defaultSentences = parts.slice(1).filter((sentence) =>
    sentence.toLocaleLowerCase('en-US').startsWith(className.toLocaleLowerCase('en-US'))
    && !/\b(?:not|exception|at least)\b/iu.test(sentence));
  if (defaultSentences.length === 0) return undefined;
  const properties = defaultSentences.map((sentence) => sentence.slice(className.length).trim()
    .replace(/^(?:are|is)\s+/iu, '').replace(/^(?:usually|typically|normally|often|always)\s+/iu, ''));
  const exceptionMembers = new Set();
  const explicit = [];
  for (const sentence of parts.slice(1)) {
    for (const member of members) {
      if (!sentence.toLocaleLowerCase('en-US').startsWith(member.toLocaleLowerCase('en-US'))) continue;
      if (/possibly an exception/iu.test(sentence)) exceptionMembers.add(member);
      else if (!polarityOf(sentence)) explicit.push({ member, propertyIndex: 0, positive: false });
    }
  }
  const otherMatch = context.match(/at least one of\s+(.+?)\s+or\s+(.+?)\s+(?:does|do|is|are)/iu);
  const constrainedMembers = otherMatch ? [otherMatch[1].trim(), otherMatch[2].trim()] : [];
  return { members, className, properties, exceptionMembers, explicit, constrainedMembers };
}

function propertyAtom(member, propertyIndex) {
  return atom(`property:${identifier(member)}:${propertyIndex + 1}`);
}

function queryForMembershipTheory(question, theory) {
  const content = question.replace(/^(?:does this (?:mean|imply|entail)(?: that)?)\s+/iu, '').replace(/[?]+$/u, '').trim();
  if (/\bexactly one of\b/iu.test(content)) {
    const members = theory.constrainedMembers.length === 2 ? theory.constrainedMembers : theory.members.slice(0, 2);
    if (members.length !== 2) return undefined;
    const positive = !/exactly one of.+?\b(?:does not|do not|doesn['’]?t|don['’]?t|isn['’]?t|aren['’]?t)\b/iu.test(content);
    return exclusiveOr(literalFor(propertyAtom(members[0], 0), positive), literalFor(propertyAtom(members[1], 0), positive));
  }
  const pieces = content.split(/\s+and\s+/iu);
  const formulas = [];
  for (const piece of pieces) {
    const member = theory.members.find((candidate) =>
      new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'iu').test(piece));
    if (member) formulas.push(literalFor(propertyAtom(member, formulas.length < theory.properties.length ? formulas.length : 0), polarityOf(piece)));
  }
  if (formulas.length) return conjunction(formulas);
  if (/all other\b|\bmost\b|\busually\b/iu.test(content)) {
    return literalFor(propertyAtom('generic-other-member', 0), polarityOf(content));
  }
  return undefined;
}

function evaluateMembershipDefaults(context, question) {
  const theory = membershipTheory(context);
  if (!theory) return undefined;
  const domainMembers = [...new Set([...theory.members, 'generic-other-member', ...theory.constrainedMembers])];
  const domainFacts = domainMembers.map((member) => atom(`domain:${identifier(member)}`));
  const defaults = [];
  for (let propertyIndex = 0; propertyIndex < theory.properties.length; propertyIndex += 1) {
    for (let memberIndex = 0; memberIndex < domainMembers.length; memberIndex += 1) {
      const member = domainMembers[memberIndex];
      if (theory.exceptionMembers.has(member)) continue;
      defaults.push({
        antecedent: domainFacts[memberIndex], consequent: propertyAtom(member, propertyIndex), priority: 0,
      });
    }
  }
  const premises = [...domainFacts];
  for (const item of theory.explicit) premises.push(literalFor(propertyAtom(item.member, item.propertyIndex), item.positive));
  if (theory.constrainedMembers.length === 2) {
    premises.push(binary('or', negate(propertyAtom(theory.constrainedMembers[0], 0)),
      negate(propertyAtom(theory.constrainedMembers[1], 0))));
  }
  const query = queryForMembershipTheory(question, theory);
  if (!query) return undefined;
  const result = decidePreferredEntailment({ premises, defaults, query });
  return { ...result, method: 'method:core:preferred-entailment' };
}

function evaluateCardinalityDefaults(context, question) {
  if (!/at least one\b/iu.test(context) || !/exactly one\b/iu.test(question)) return undefined;
  const members = ['witness-one', 'witness-two'];
  const domainFacts = members.map((member) => atom(`domain:${member}`));
  const properties = members.map((member) => propertyAtom(member, 0));
  const premises = [...domainFacts, binary('or', negate(properties[0]), negate(properties[1]))];
  const defaults = properties.map((consequent, index) => ({ antecedent: domainFacts[index], consequent, priority: 0 }));
  const positive = !/exactly one.+?\b(?:does not|do not|doesn['’]?t|don['’]?t|isn['’]?t|aren['’]?t)\b/iu.test(question);
  const query = exclusiveOr(literalFor(properties[0], positive), literalFor(properties[1], positive));
  const result = decidePreferredEntailment({ premises, defaults, query });
  return { ...result, method: 'method:core:preferred-entailment' };
}

export function evaluateControlledDefaultArgument(context, question) {
  return parsePriorityArgument(context, question)
    ?? evaluateMembershipDefaults(context, question)
    ?? evaluateCardinalityDefaults(context, question)
    ?? { status: 'UNPARSED', entailed: undefined, diagnostic: 'No supported finite default theory was identified.' };
}
