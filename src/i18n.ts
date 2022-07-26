import { getLanguage } from '@vikadata/widget-sdk';
import stringsConfigJson from './strings.json';

interface ILanguageField {
  zh_CN: string;
  en_US: string;
}

export const Strings = stringsConfigJson.strings;

export const t = (field: ILanguageField) => {
  const lang = getLanguage().replace('-', '_');
  return field[lang];
};