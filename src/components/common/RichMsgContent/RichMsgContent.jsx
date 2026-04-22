import './richMsgContent.less';

export default function RichMsgContent(props) {
  const { defaultText = '', richText = '' } = props;

  return richText ? (
    <span
      className="rich-msg-content"
      title={defaultText}
      dangerouslySetInnerHTML={{ __html: richText }}
    />
  ) : (
    defaultText
  );
}
