import React from "react";

export interface IUploadProps {
  onUpload(text: string): void;
}

export function Upload(props: IUploadProps) {
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        props.onUpload(e.target!.result as string);
      };
      reader.readAsText(files[0], "utf8");
    }
  }

  return (
    <form>
      <label>
        Choose .pln file:
        <input type="file" accept=".pln" onChange={handleFiles}></input>
      </label>
    </form>
  );
}
