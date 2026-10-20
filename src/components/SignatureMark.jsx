export default function SignatureMark(props) {
  return (
    <span
      className={['signature-mark', props.className || ''].filter(Boolean).join(' ')}
      role={props.decorative ? undefined : 'img'}
      aria-hidden={props.decorative ? 'true' : undefined}
      aria-label={props.decorative ? undefined : props.label || 'SMilE萝卜'}
    />
  )
}
