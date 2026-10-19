import type { PatternFixture } from "@/catalogue/types"

const DEFORM = "Deform"

export const deformFixtures: readonly PatternFixture[] = [
  {
    library: DEFORM,
    patternKey: "factory:Form:*",
    matches: [
      "from deform import Form\n\nmyform = Form(schema, buttons=(\"submit\",))",
    ],
    rejects: [
      "def Form(*parts, **options):\n    return parts\n\nmyform = Form(schema, buttons=(\"submit\",))",
    ],
  },
  {
    library: DEFORM,
    patternKey: "factory:Form:*>call:validate:*",
    matches: [
      "from deform import Form\n\nmyform = Form(schema, buttons=(\"submit\",))\nappstruct = myform.validate(controls)",
    ],
    rejects: [
      "myform = LocalRegistry()\nappstruct = myform.validate(controls)",
    ],
  },
  {
    library: DEFORM,
    patternKey: "factory:Form:*>call:render:*",
    matches: [
      "from deform import Form\n\nmyform = Form(schema, buttons=(\"submit\",))\nform = myform.render(appstruct, readonly=True)",
    ],
    rejects: [
      "myform = LocalRegistry()\nform = myform.render(appstruct, readonly=True)",
    ],
  },
]

const DJANGO_CRISPY_FORMS = "django-crispy-forms"

export const djangoCrispyFormsFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_CRISPY_FORMS,
    patternKey: "factory:FormHelper:*",
    matches: [
      "from crispy_forms.helper import FormHelper\n\nclass ExampleForm(forms.Form):\n    def __init__(self, *args, **kwargs):\n        super().__init__(*args, **kwargs)\n        self.helper = FormHelper(self)",
    ],
    rejects: [
      "def FormHelper(*parts, **options):\n    return parts\n\nclass ExampleForm(forms.Form):\n    def __init__(self, *args, **kwargs):\n        super().__init__(*args, **kwargs)\n        self.helper = FormHelper(self)",
    ],
  },
]

const WTFORMS = "WTForms"

export const wtformsFixtures: readonly PatternFixture[] = [
  {
    library: WTFORMS,
    patternKey: "class:Form:*",
    matches: [
      "from wtforms import Form, StringField, validators\n\nclass RegistrationForm(Form):\n    username = StringField(\"Username\", [validators.Length(min=4, max=25)])",
    ],
    rejects: [
      "class Form:\n    pass\n\nclass RegistrationForm(Form):\n    username = StringField(\"Username\", [validators.Length(min=4, max=25)])",
    ],
  },
  {
    library: WTFORMS,
    patternKey: "class:Form:*>call:validate:*",
    matches: [
      "from wtforms import Form, StringField\n\nclass RegistrationForm(Form):\n    username = StringField(\"Username\")\n\nform = RegistrationForm(request.POST)\nis_valid = form.validate()",
    ],
    rejects: [
      "form = LocalRegistry()\nis_valid = form.validate()",
    ],
  },
  {
    library: WTFORMS,
    patternKey: "class:Form:*>call:populate_obj:*",
    matches: [
      "from wtforms import Form, StringField\n\nclass ProfileForm(Form):\n    username = StringField(\"Username\")\n\nform = ProfileForm(request.POST, obj=user)\nform.populate_obj(user)",
    ],
    rejects: [
      "form = LocalRegistry()\nform.populate_obj(user)",
    ],
  },
]

const FLASK_WTF = "Flask-WTF"

export const flaskWtfFixtures: readonly PatternFixture[] = [
  {
    library: FLASK_WTF,
    patternKey: "class:FlaskForm:*",
    matches: [
      "from flask_wtf import FlaskForm\n\nclass MyForm(FlaskForm):\n    name = StringField(\"name\", validators=[DataRequired()])",
    ],
    rejects: [
      "class FlaskForm:\n    pass\n\nclass MyForm(FlaskForm):\n    name = StringField(\"name\", validators=[DataRequired()])",
    ],
  },
  {
    library: FLASK_WTF,
    patternKey: "class:FlaskForm:*>call:validate_on_submit:*",
    matches: [
      "from flask_wtf import FlaskForm\n\nclass MyForm(FlaskForm):\n    name = StringField(\"name\")\n\nform = MyForm()\nsubmitted = form.validate_on_submit()",
    ],
    rejects: [
      "form = LocalRegistry()\nsubmitted = form.validate_on_submit()",
    ],
  },
  {
    library: FLASK_WTF,
    patternKey: "factory:CSRFProtect:*",
    matches: [
      "from flask_wtf.csrf import CSRFProtect\n\ncsrf = CSRFProtect(app)",
    ],
    rejects: [
      "def CSRFProtect(*parts, **options):\n    return parts\n\ncsrf = CSRFProtect(app)",
    ],
  },
  {
    library: FLASK_WTF,
    patternKey: "factory:CSRFProtect:*>decorator:exempt:*",
    matches: [
      "from flask_wtf.csrf import CSRFProtect\n\ncsrf = CSRFProtect(app)\n\n@csrf.exempt\ndef my_handler():\n    return \"ok\"",
    ],
    rejects: [
      "csrf = LocalRegistry()\n\n@csrf.exempt\ndef my_handler():\n    return \"ok\"",
    ],
  },
  {
    library: FLASK_WTF,
    patternKey: "factory:CSRFProtect:*>call:protect:*",
    matches: [
      "from flask_wtf.csrf import CSRFProtect\n\ncsrf = CSRFProtect()\n\ndef check_csrf():\n    csrf.protect()",
    ],
    rejects: [
      "csrf = LocalRegistry()\n\ndef check_csrf():\n    csrf.protect()",
    ],
  },
]

const DJANGO_FORMTOOLS = "django-formtools"

export const djangoFormtoolsFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_FORMTOOLS,
    patternKey: "class:SessionWizardView:*",
    matches: [
      "from formtools.wizard.views import SessionWizardView\n\nclass ContactWizard(SessionWizardView):\n    def done(self, form_list, **kwargs):\n        return render(self.request, \"done.html\", {\"form_data\": [form.cleaned_data for form in form_list]})",
    ],
    rejects: [
      "class SessionWizardView:\n    pass\n\nclass ContactWizard(SessionWizardView):\n    def done(self, form_list, **kwargs):\n        return render(self.request, \"done.html\", {\"form_data\": [form.cleaned_data for form in form_list]})",
    ],
  },
  {
    library: DJANGO_FORMTOOLS,
    patternKey: "class:CookieWizardView:*",
    matches: [
      "from formtools.wizard.views import CookieWizardView\n\nclass ContactWizard(CookieWizardView):\n    def done(self, form_list, **kwargs):\n        return HttpResponseRedirect(\"/thanks/\")",
    ],
    rejects: [
      "class CookieWizardView:\n    pass\n\nclass ContactWizard(CookieWizardView):\n    def done(self, form_list, **kwargs):\n        return HttpResponseRedirect(\"/thanks/\")",
    ],
  },
  {
    library: DJANGO_FORMTOOLS,
    patternKey: "class:FormPreview:*",
    matches: [
      "from formtools.preview import FormPreview\n\nclass SomeModelFormPreview(FormPreview):\n    def done(self, request, cleaned_data):\n        return HttpResponseRedirect(\"/form/success\")",
    ],
    rejects: [
      "class FormPreview:\n    pass\n\nclass SomeModelFormPreview(FormPreview):\n    def done(self, request, cleaned_data):\n        return HttpResponseRedirect(\"/form/success\")",
    ],
  },
]
