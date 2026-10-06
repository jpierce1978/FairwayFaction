import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'onPrimary' | 'onDanger';

const variantClass: Record<TextVariant, string> = {
  display: 'text-[40px] leading-[46px] font-extrabold',
  title: 'text-[30px] leading-[36px] font-bold',
  heading: 'text-[22px] leading-[28px] font-bold',
  body: 'text-[17px] leading-[24px]',
  label: 'text-[16px] leading-[22px] font-semibold',
  caption: 'text-[14px] leading-[20px]',
};

const toneClass: Record<TextTone, string> = {
  default: 'text-content',
  muted: 'text-content-muted',
  primary: 'text-primary',
  danger: 'text-danger',
  onPrimary: 'text-on-primary',
  onDanger: 'text-on-danger',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
}

/** Respects the user's dynamic type setting (allowFontScaling is on by default). */
export function Text({ variant = 'body', tone = 'default', className = '', ...rest }: TextProps) {
  return (
    <RNText className={`${variantClass[variant]} ${toneClass[tone]} ${className}`} {...rest} />
  );
}
