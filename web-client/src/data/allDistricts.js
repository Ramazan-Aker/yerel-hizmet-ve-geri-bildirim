// Tüm il ve ilçe verilerini tek bir dosyada birleştiriyoruz
import { districts } from './districts';
import { districts_part2 } from './districts_part2';
import { districts_part3 } from './districts_part3';
import { districts_part4 } from './districts_part4';

// Tüm ilçe verilerini birleştirme
export const allDistricts = {
  ...districts,
  ...districts_part2,
  ...districts_part3,
  ...districts_part4
};

export default allDistricts; 