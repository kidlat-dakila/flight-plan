const PLANE_PICTURE_SIZE = 160

const PlanePicture = ({ src }: { readonly src: string }) => (
  <img src={src} alt="" width={PLANE_PICTURE_SIZE} height={PLANE_PICTURE_SIZE} className="size-40" />
)

export default PlanePicture
