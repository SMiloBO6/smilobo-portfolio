export default function CarrotMascot(props) {
  const size = props.size || 104
  return (
    <img
      className={'carrot-mascot-art' + (props.className ? ' ' + props.className : '')}
      src="/carrot-mascot.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  )
}
